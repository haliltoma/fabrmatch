import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Chargeback from '#models/chargeback'
import Order from '#models/order'
import LedgerService from '#services/payments/ledger_service'

export class ChargebackError extends DomainError {}

/**
 * A card chargeback pauses every payout for the order until an admin decides. "Won" releases the
 * hold. "Lost" means the bank takes the money back: whatever still sits in escrow is written off
 * as cash that left, and anything already paid out is recorded as a platform loss for follow-up.
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
      cb.status = 'lost'
      cb.writtenOffMinor = fromEscrow
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
            uncoveredMinor: cb.amountMinor - fromEscrow,
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
