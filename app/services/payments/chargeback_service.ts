import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Chargeback from '#models/chargeback'
import Order from '#models/order'
import Payout from '#models/payout'
import LedgerService from '#services/payments/ledger_service'

export class ChargebackError extends DomainError {}

/**
 * A card chargeback pauses every payout for the order until an admin decides. "Won" releases the
 * hold. "Lost" means the bank takes the money back, and the whole amount leaves cash: first from
 * escrow, then by cancelling payouts not paid yet (the platform does not pay out money it no
 * longer has), and whatever was already paid out is booked as `chargeback_loss`.
 */
export default class ChargebackService {
  private ledger = new LedgerService()

  async listOpen() {
    const rows = await Chargeback.query().where('status', 'open').orderBy('id', 'asc')
    const orders = await Order.query().whereIn(
      'id',
      rows.map((r) => r.orderId)
    )
    const byId = new Map(orders.map((o) => [o.id, o]))
    return rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderCode: byId.get(r.orderId)?.code ?? '',
      amountMinor: r.amountMinor,
      currency: r.currency,
      createdAt: r.createdAt.toISO(),
    }))
  }

  async won(id: number, adminId: number, note?: string) {
    const orderId = await this.close(id, 'won', adminId, note)
    // the hold is gone; the sweep would pick it up anyway, this just avoids the wait
    const { default: PayoutService } = await import('#services/payments/payout_service')
    await new PayoutService().processPending(orderId).catch(() => {})
  }

  async lost(id: number, adminId: number, note?: string) {
    await db.transaction(async (trx) => {
      const cb = await Chargeback.query({ client: trx }).where('id', id).forUpdate().first()
      if (!cb || cb.status !== 'open') throw new ChargebackError('Chargeback not found')

      const escrow = await this.ledger.balance('buyer_escrow', {
        orderId: cb.orderId,
        currency: cb.currency,
        trx,
      })
      const fromEscrow = Math.min(escrow, cb.amountMinor)
      if (fromEscrow > 0) {
        // the bank takes it directly: escrow → refund owed → cash gone, no provider call
        await this.ledger.post(
          [
            { account: 'buyer_escrow', direction: 'debit', amountMinor: fromEscrow },
            { account: 'refund', direction: 'credit', amountMinor: fromEscrow },
          ],
          { orderId: cb.orderId, currency: cb.currency, memo: `chargeback ${cb.id} lost`, trx }
        )
        await this.ledger.post(
          [
            { account: 'refund', direction: 'debit', amountMinor: fromEscrow },
            { account: 'provider_cash', direction: 'credit', amountMinor: fromEscrow },
          ],
          {
            orderId: cb.orderId,
            currency: cb.currency,
            memo: `chargeback ${cb.id} settled by bank`,
            trx,
          }
        )
      }
      let remaining = cb.amountMinor - fromEscrow

      // payouts allocated but not paid yet: cancel them, settling what they owed against the cash
      // the bank took. A payout larger than what is left stays; its share becomes the loss below.
      const unpaid = await Payout.query({ client: trx })
        .where('orderId', cb.orderId)
        .whereIn('status', ['pending', 'awaiting_document'])
        .where('currency', cb.currency)
        .orderBy('amountMinor', 'desc')
        .forUpdate()
      const cancelled: number[] = []
      for (const payout of unpaid) {
        if (payout.amountMinor > remaining) continue
        payout.status = 'cancelled'
        await payout.useTransaction(trx).save()
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
          {
            orderId: cb.orderId,
            currency: cb.currency,
            memo: `chargeback ${cb.id} lost: payout ${payout.id} cancelled`,
            trx,
          }
        )
        remaining -= payout.amountMinor
        cancelled.push(payout.id)
      }

      // already paid out: the makers and seller keep it, the platform carries the loss
      if (remaining > 0) {
        await this.ledger.post(
          [
            { account: 'chargeback_loss', direction: 'debit', amountMinor: remaining },
            { account: 'provider_cash', direction: 'credit', amountMinor: remaining },
          ],
          {
            orderId: cb.orderId,
            currency: cb.currency,
            memo: `chargeback ${cb.id} lost: not covered by escrow or unpaid payouts`,
            trx,
          }
        )
      }

      cb.status = 'lost'
      cb.writtenOffMinor = cb.amountMinor
      cb.note = note?.trim().slice(0, 300) || null
      cb.resolvedBy = adminId
      cb.resolvedAt = DateTime.now()
      await cb.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'chargeback.lost',
          subjectType: 'order',
          subjectId: cb.orderId,
          meta: {
            chargebackId: cb.id,
            fromEscrowMinor: fromEscrow,
            cancelledPayoutIds: cancelled,
            lossMinor: remaining,
          },
        },
        { client: trx }
      )
    })
  }

  private async close(id: number, status: 'won' | 'lost', adminId: number, note?: string) {
    return db.transaction(async (trx) => {
      const cb = await Chargeback.query({ client: trx }).where('id', id).forUpdate().first()
      if (!cb || cb.status !== 'open') throw new ChargebackError('Chargeback not found')
      cb.status = status
      cb.note = note?.trim().slice(0, 300) || null
      cb.resolvedBy = adminId
      cb.resolvedAt = DateTime.now()
      await cb.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: `chargeback.${status}`,
          subjectType: 'order',
          subjectId: cb.orderId,
          meta: { chargebackId: cb.id },
        },
        { client: trx }
      )
      return cb.orderId
    })
  }
}
