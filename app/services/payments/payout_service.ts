import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import Order from '#models/order'
import Chargeback from '#models/chargeback'
import Dispute from '#models/dispute'
import Payment from '#models/payment'
import Payout from '#models/payout'
import ProductionJob from '#models/production_job'
import AuditLog from '#models/audit_log'
import LedgerService from '#services/payments/ledger_service'
import OrderNotifier from '#services/notifications/order_notifier'
import { paymentProvider } from '#services/payments/provider_registry'
import type { PaymentProvider } from '#services/payments/provider'

export class PayoutError extends DomainError {}

export interface ReleaseResult {
  /** True when this call created the payouts (false = they already existed). */
  allocated: boolean
  paid: number
  pending: number
}

export default class PayoutService {
  private ledger = new LedgerService()
  private notifier = new OrderNotifier()

  private injectedProvider: PaymentProvider | null

  constructor(provider: PaymentProvider | null = null) {
    this.injectedProvider = provider
  }

  private get provider(): PaymentProvider {
    return (this.injectedProvider ??= paymentProvider())
  }

  /**
   * PRD §11 step 3. Releases escrow: allocates it to platform fee / seller / manufacturer, then
   * asks the provider to pay the sub-merchants. Business rule 5: never before the order is
   * `completed` (or resolved in the manufacturer's favour) and never while a dispute is open.
   * Idempotent — safe to call from the job, the sweep and by hand.
   */
  async release(orderId: number): Promise<ReleaseResult> {
    const allocated = await db.transaction((trx) => this.allocate(orderId, trx))
    const { paid, pending } = await this.processPending(orderId)
    return { allocated, paid, pending }
  }

  private async allocate(orderId: number, trx: TransactionClientContract): Promise<boolean> {
    const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().firstOrFail()

    const existing = await Payout.query({ client: trx }).where('orderId', orderId).first()
    if (existing) return false

    const chargeback = await Chargeback.query({ client: trx })
      .where('orderId', orderId)
      .where('status', 'open')
      .first()
    if (chargeback) throw new PayoutError('Payout is blocked while a chargeback is open')

    const dispute = await Dispute.query({ client: trx })
      .where('orderId', orderId)
      .orderBy('id', 'desc')
      .first()
    if (dispute && dispute.status !== 'resolved') {
      throw new PayoutError('Payout is blocked while a dispute is open')
    }
    if (order.status === 'resolved') {
      if (!dispute || dispute.resolution === 'full_refund') {
        throw new PayoutError('This order was fully refunded — nothing to pay out')
      }
    } else if (order.status !== 'completed') {
      throw new PayoutError('Payout is only possible after the order is completed')
    }

    const job = await ProductionJob.query({ client: trx })
      .where('orderId', orderId)
      .whereNot('status', 'cancelled')
      .first()
    if (!job) throw new PayoutError('Order has no production job to pay')

    const escrow = await this.ledger.balance('buyer_escrow', {
      orderId,
      currency: order.currency,
      trx,
    })
    const platformFee = order.platformFeeMinor
    const sellerShare = order.sellerId ? order.sellerShareMinor : 0
    const manufacturerShare = escrow - platformFee - sellerShare
    if (escrow <= 0 || manufacturerShare < 0) {
      throw new PayoutError(
        `Escrow ${escrow} cannot cover fee ${platformFee} + seller ${sellerShare}`
      )
    }

    await this.ledger.post(
      [
        { account: 'buyer_escrow', direction: 'debit', amountMinor: escrow },
        ...(platformFee > 0
          ? [
              {
                account: 'platform_fee' as const,
                direction: 'credit' as const,
                amountMinor: platformFee,
              },
            ]
          : []),
        ...(sellerShare > 0
          ? [
              {
                account: 'seller_payable' as const,
                direction: 'credit' as const,
                amountMinor: sellerShare,
              },
            ]
          : []),
        ...(manufacturerShare > 0
          ? [
              {
                account: 'manufacturer_payable' as const,
                direction: 'credit' as const,
                amountMinor: manufacturerShare,
              },
            ]
          : []),
      ],
      { orderId, currency: order.currency, memo: 'escrow released', trx }
    )

    if (manufacturerShare > 0) {
      await Payout.create(
        {
          orderId,
          beneficiaryType: 'manufacturer',
          beneficiaryId: job.manufacturerProfileId,
          amountMinor: manufacturerShare,
          currency: order.currency,
          status: 'pending',
        },
        { client: trx }
      )
    }
    if (sellerShare > 0 && order.sellerId) {
      await Payout.create(
        {
          orderId,
          beneficiaryType: 'seller',
          beneficiaryId: order.sellerId,
          amountMinor: sellerShare,
          currency: order.currency,
          status: 'pending',
        },
        { client: trx }
      )
    }
    await AuditLog.create(
      {
        action: 'payout.allocated',
        subjectType: 'order',
        subjectId: orderId,
        meta: { escrow, platformFee, sellerShare, manufacturerShare },
      },
      { client: trx }
    )
    return true
  }

  /** Pays every pending payout of an order; a provider failure leaves it pending for the retry sweep. */
  async processPending(orderId: number): Promise<{ paid: number; pending: number }> {
    const payment = await Payment.query()
      .where('orderId', orderId)
      .whereIn('status', ['succeeded', 'partially_refunded'])
      .orderBy('id', 'asc')
      .first()
    let paid = 0
    let pending = 0

    const payouts = await Payout.query()
      .where('orderId', orderId)
      .where('status', 'pending')
      .orderBy('id')
    for (const payout of payouts) {
      try {
        if (!payment) throw new PayoutError('No captured payment for this order')
        const openChargeback = await Chargeback.query()
          .where('orderId', orderId)
          .where('status', 'open')
          .first()
        if (openChargeback) throw new PayoutError('Payout is blocked while a chargeback is open')
        if (!(await this.beneficiaryVerified(payout))) {
          throw new PayoutError('Beneficiary e-mail is not verified — payout stays pending')
        }
        const result = await this.provider.approveItem({
          providerRef: payment.providerRef,
          beneficiaryType: payout.beneficiaryType,
          beneficiaryId: payout.beneficiaryId,
          amountMinor: payout.amountMinor,
          currency: payout.currency,
          idempotencyKey: `payout:${payout.id}`,
        })
        await db.transaction(async (trx) => {
          const locked = await Payout.query({ client: trx })
            .where('id', payout.id)
            .forUpdate()
            .firstOrFail()
          if (locked.status === 'paid') return
          locked.status = 'paid'
          locked.providerRef = result.providerRef
          locked.paidAt = DateTime.now()
          await locked.useTransaction(trx).save()
          await this.ledger.post(
            [
              {
                account:
                  payout.beneficiaryType === 'manufacturer'
                    ? 'manufacturer_payable'
                    : 'seller_payable',
                direction: 'debit',
                amountMinor: payout.amountMinor,
              },
              { account: 'provider_cash', direction: 'credit', amountMinor: payout.amountMinor },
            ],
            { orderId, currency: payout.currency, memo: `payout ${payout.id} paid`, trx }
          )
        })
        paid++
        await this.notifier.payoutPaid(payout)
      } catch (error) {
        pending++
        logger.error({
          msg: 'payout approval failed',
          payoutId: payout.id,
          error: (error as Error).message,
        })
      }
    }
    return { paid, pending }
  }

  /** Payouts go only to accounts whose e-mail is verified (R0-T2). */
  private async beneficiaryVerified(payout: Payout): Promise<boolean> {
    let userId: number | null = payout.beneficiaryId
    if (payout.beneficiaryType === 'manufacturer') {
      const profile = await db
        .from('manufacturer_profiles')
        .where('id', payout.beneficiaryId)
        .select('user_id')
        .first()
      userId = profile?.user_id ?? null
    }
    if (!userId) return false
    const user = await db.from('users').where('id', userId).select('email_verified_at').first()
    return !!user?.email_verified_at
  }

  /** Sweep: orders that should have been released but weren't, plus payouts stuck pending. */
  async releaseDue(): Promise<{ released: number }> {
    const rows = await db.rawQuery(
      `select o.id from orders o
        where (
          o.status = 'completed'
          or (o.status = 'resolved' and exists (
                select 1 from disputes d where d.order_id = o.id and d.status = 'resolved'
                   and d.resolution in ('release', 'partial_refund')))
        )
        and (
          not exists (select 1 from payouts p where p.order_id = o.id)
          or exists (select 1 from payouts p where p.order_id = o.id and p.status = 'pending')
        )
        and not exists (select 1 from disputes d where d.order_id = o.id and d.status <> 'resolved')
        order by o.id
        limit 100`
    )
    let released = 0
    for (const { id } of rows.rows as Array<{ id: number }>) {
      try {
        await this.release(id)
        released++
      } catch (error) {
        logger.error({ msg: 'payout release failed', orderId: id, error: (error as Error).message })
      }
    }
    return { released }
  }
}
