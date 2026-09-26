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
import fabrmatchConfig from '#config/fabrmatch'
import { salesModel, type SalesModel } from '#services/payments/sales_model'
import PayeeProfileService from '#services/payments/payee/payee_profile_service'
import PayoutDocumentService from '#services/payments/payee/payout_document_service'
import {
  saleBreakdown,
  splitPayeeShare,
  treatmentFor,
  type PayeeSplit,
  type TaxTreatment,
} from '#services/payments/payee/tax_treatment'
import type PayeeTaxProfile from '#models/payee_tax_profile'
import type { LedgerLine } from '#services/payments/ledger_service'

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
  private model: SalesModel
  private payees = new PayeeProfileService()
  private documents = new PayoutDocumentService()

  constructor(provider: PaymentProvider | null = null, model: SalesModel = salesModel()) {
    this.injectedProvider = provider
    this.model = model
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
    const { allocated, needInvoice, orderCode } = await db.transaction((trx) =>
      this.allocate(orderId, trx)
    )
    for (const payout of needInvoice) await this.documents.askForInvoice(payout, orderCode)
    const { paid, pending } = await this.processPending(orderId)
    return { allocated, paid, pending }
  }

  private async allocate(
    orderId: number,
    trx: TransactionClientContract
  ): Promise<{ allocated: boolean; needInvoice: Payout[]; orderCode: string }> {
    const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().firstOrFail()

    const existing = await Payout.query({ client: trx }).where('orderId', orderId).first()
    if (existing) return { allocated: false, needInvoice: [], orderCode: order.code }

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

    if (this.model === 'merchant_of_record') {
      const needInvoice = await this.allocateAsSeller(order, trx, {
        escrow,
        manufacturer: { id: job.manufacturerProfileId, share: manufacturerShare },
        seller:
          sellerShare > 0 && order.sellerId ? { id: order.sellerId, share: sellerShare } : null,
      })
      return { allocated: true, needInvoice, orderCode: order.code }
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
    return { allocated: true, needInvoice: [], orderCode: order.code }
  }

  /**
   * Sales model B (R7-T2): Fabrmatch sold the item, so the escrow becomes our sale. It owes the
   * output VAT on all of it and buys the work from the maker (and the seller's share) as a
   * purchase: VAT-registered payees invoice their share with VAT (reclaimed as input VAT), payees
   * outside VAT get the share without its VAT part, home producers also have income tax withheld.
   * Our own result is what is left (`platform_fee`). Nothing is allocated until every payee's tax
   * and bank details are approved (R7-T3). Returns the payouts that wait for an invoice.
   */
  private async allocateAsSeller(
    order: Order,
    trx: TransactionClientContract,
    input: {
      escrow: number
      manufacturer: { id: number; share: number }
      seller: { id: number; share: number } | null
    }
  ): Promise<Payout[]> {
    const withholdingBps = fabrmatchConfig.payouts.homeExemptWithholdingBps
    const shares = [
      { type: 'manufacturer' as const, ...input.manufacturer },
      ...(input.seller ? [{ type: 'seller' as const, ...input.seller }] : []),
    ].filter((s) => s.share > 0)

    const lines: Array<
      (typeof shares)[number] & {
        profile: PayeeTaxProfile
        treatment: TaxTreatment
        split: PayeeSplit
      }
    > = []
    for (const share of shares) {
      const profile = await this.payees.approved({ type: share.type, id: share.id }, trx)
      if (!profile) {
        throw new PayoutError(
          `Payout waits for the ${share.type === 'manufacturer' ? 'maker' : 'seller'}'s approved tax and bank details`
        )
      }
      const treatment = treatmentFor(profile.taxStatus, withholdingBps)
      const split = splitPayeeShare(share.share, order.taxRateBps, treatment)
      if (profile.taxStatus === 'home_exempt') {
        await this.assertUnderExemptionCap(share, split.grossMinor, order.currency, trx)
      }
      lines.push({ ...share, profile, treatment, split })
    }

    const { outputVat, inputVat, withheld, ours } = saleBreakdown(
      input.escrow,
      order.taxRateBps,
      lines.map((l) => l.split)
    )
    const payable = (type: 'manufacturer' | 'seller') =>
      lines.filter((l) => l.type === type).reduce((sum, l) => sum + l.split.payableMinor, 0)
    const entries: LedgerLine[] = [
      { account: 'buyer_escrow', direction: 'debit', amountMinor: input.escrow },
      { account: 'vat_receivable', direction: 'debit', amountMinor: inputVat },
      { account: 'vat_payable', direction: 'credit', amountMinor: outputVat },
      {
        account: 'manufacturer_payable',
        direction: 'credit',
        amountMinor: payable('manufacturer'),
      },
      { account: 'seller_payable', direction: 'credit', amountMinor: payable('seller') },
      { account: 'withholding_payable', direction: 'credit', amountMinor: withheld },
      {
        account: 'platform_fee',
        direction: ours >= 0 ? 'credit' : 'debit',
        amountMinor: Math.abs(ours),
      },
    ]
    await this.ledger.post(
      entries.filter((e) => e.amountMinor > 0),
      {
        orderId: order.id,
        currency: order.currency,
        memo: 'sale recognised, purchases booked',
        trx,
      }
    )

    const needInvoice: Payout[] = []
    for (const line of lines) {
      if (line.split.payableMinor <= 0) continue
      const payout = await Payout.create(
        {
          orderId: order.id,
          beneficiaryType: line.type,
          beneficiaryId: line.id,
          amountMinor: line.split.payableMinor,
          grossMinor: line.split.grossMinor,
          vatMinor: line.split.vatMinor,
          withholdingMinor: line.split.withholdingMinor,
          taxStatus: line.profile.taxStatus,
          currency: order.currency,
          status: line.treatment.document === 'expense_voucher' ? 'pending' : 'awaiting_document',
        },
        { client: trx }
      )
      if (line.treatment.document === 'expense_voucher') {
        await this.documents.issueVoucher(payout, trx)
      } else {
        needInvoice.push(payout)
      }
    }

    await AuditLog.create(
      {
        action: 'payout.allocated',
        subjectType: 'order',
        subjectId: order.id,
        meta: {
          model: 'merchant_of_record',
          escrow: input.escrow,
          outputVat,
          inputVat,
          withheld,
          ours,
          payees: lines.map((l) => ({ type: l.type, taxStatus: l.profile.taxStatus, ...l.split })),
        },
      },
      { client: trx }
    )
    return needInvoice
  }

  /** GVK 9/6: a home producer's yearly sales stay under the limit (TRY payouts are counted). */
  private async assertUnderExemptionCap(
    payee: { type: 'manufacturer' | 'seller'; id: number },
    grossMinor: number,
    currency: string,
    trx: TransactionClientContract
  ) {
    if (currency !== 'TRY') {
      throw new PayoutError('Home producers can only be paid for orders in TRY')
    }
    const row = await trx
      .from('payouts')
      .where('beneficiary_type', payee.type)
      .where('beneficiary_id', payee.id)
      .where('tax_status', 'home_exempt')
      .where('currency', 'TRY')
      .where('created_at', '>=', DateTime.now().startOf('year').toSQL()!)
      .sum('gross_minor as total')
      .first()
    const cap = fabrmatchConfig.payouts.homeExemptAnnualCapMinor
    if (Number(row?.total ?? 0) + grossMinor > cap) {
      throw new PayoutError(
        'This payout would take the maker past the yearly limit of the home-production exemption'
      )
    }
  }

  /**
   * Sales model B: payouts are bank transfers from Fabrmatch's account. Finance sends them, then
   * marks each one paid with the bank reference; the ledger moves the payable to cash only then.
   */
  async markPaid(adminId: number, payoutId: number, reference: string) {
    const ref = reference.trim()
    if (ref.length < 3) throw new PayoutError('Enter the bank transfer reference')
    const payout = await db.transaction(async (trx) => {
      const row = await Payout.query({ client: trx })
        .where('id', payoutId)
        .forUpdate()
        .firstOrFail()
      if (row.status !== 'pending') throw new PayoutError('This payout is not ready to be paid')
      const chargeback = await Chargeback.query({ client: trx })
        .where('orderId', row.orderId)
        .where('status', 'open')
        .first()
      if (chargeback) throw new PayoutError('Payout is blocked while a chargeback is open')
      const profile = await this.payees.approved(
        { type: row.beneficiaryType, id: row.beneficiaryId },
        trx
      )
      // details changed since the invoice was approved: they must be approved again first
      if (!profile) throw new PayoutError('The payee’s tax and bank details are not approved')

      row.status = 'paid'
      row.paidAt = DateTime.now()
      row.paidReference = ref
      row.providerRef = `bank:${ref}`
      await row.useTransaction(trx).save()
      await this.ledger.post(
        [
          {
            account:
              row.beneficiaryType === 'manufacturer' ? 'manufacturer_payable' : 'seller_payable',
            direction: 'debit',
            amountMinor: row.amountMinor,
          },
          { account: 'provider_cash', direction: 'credit', amountMinor: row.amountMinor },
        ],
        { orderId: row.orderId, currency: row.currency, memo: `payout ${row.id} paid (bank)`, trx }
      )
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'payout.marked_paid',
          subjectType: 'payout',
          subjectId: row.id,
          meta: { reference: ref, amountMinor: row.amountMinor },
        },
        { client: trx }
      )
      return row
    })
    await this.notifier.payoutPaid(payout)
    return payout
  }

  /** Pays every pending payout of an order; a provider failure leaves it pending for the retry sweep. */
  async processPending(orderId: number): Promise<{ paid: number; pending: number }> {
    if (this.model === 'merchant_of_record') {
      // bank transfers, marked paid by finance (markPaid); nothing moves at the provider
      const rows = await Payout.query()
        .where('orderId', orderId)
        .whereIn('status', ['pending', 'awaiting_document'])
      return { paid: 0, pending: rows.length }
    }
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
        // waiting for a payee's approved details is expected, not an incident
        logger[error instanceof PayoutError ? 'warn' : 'error']({
          msg: 'payout release failed',
          orderId: id,
          error: (error as Error).message,
        })
      }
    }
    return { released }
  }
}
