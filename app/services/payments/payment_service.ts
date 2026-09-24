import GrowthService from '#services/growth/growth_service'
import User from '#models/user'
import Chargeback from '#models/chargeback'
import FraudService from '#services/admin/fraud_service'
import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import Order from '#models/order'
import Payment from '#models/payment'
import AuditLog from '#models/audit_log'
import OrderStateMachine from '#services/orders/order_state_machine'
import LedgerService from '#services/payments/ledger_service'
import OrderNotifier from '#services/notifications/order_notifier'
import FakePaymentProvider from '#services/payments/fake_provider'
import { paymentProvider } from '#services/payments/provider_registry'
import type { PaymentProvider, WebhookEvent } from '#services/payments/provider'

export class PaymentError extends DomainError {}

export type WebhookOutcome =
  { status: 'duplicate' } | { status: 'processed'; paidOrderId: number | null }

interface Applied {
  paidOrderId: number | null
  /** Order that received money it cannot take — refunded after commit. */
  orphanOrderId: number | null
  /** Event we could not apply safely: recorded for an admin instead of retried forever. */
  review?: string
}

type StartMatching = (orderId: number) => Promise<unknown>

export default class PaymentService {
  private sm = new OrderStateMachine()
  private ledger = new LedgerService()
  private notifier = new OrderNotifier()

  private injectedProvider: PaymentProvider | null

  constructor(
    provider: PaymentProvider | null = null,
    private startMatching: StartMatching = async (orderId) => {
      const { default: MatchingService } = await import('#services/matching/matching_service')
      return new MatchingService().start(orderId)
    }
  ) {
    this.injectedProvider = provider
  }

  /** Resolved lazily so pages that never touch money don't need a configured provider. */
  private get provider(): PaymentProvider {
    return (this.injectedProvider ??= paymentProvider())
  }

  /** draft → awaiting_payment and a provider checkout session for the full order total. */
  async startCheckout(orderId: number, buyerId: number) {
    const buyerEmail = await db.transaction(async (trx) => {
      const order = await Order.query({ client: trx })
        .where('id', orderId)
        .where('buyerId', buyerId)
        .preload('buyer')
        .forUpdate()
        .first()
      if (!order) throw new PaymentError('Order not found')

      if (order.status === 'draft') {
        await this.sm.transition(orderId, 'awaiting_payment', { trx, actorId: buyerId })
      } else if (order.status !== 'awaiting_payment') {
        throw new PaymentError('This order cannot be paid in its current state')
      }
      return order.buyer.email
    })

    const order = await Order.findOrFail(orderId)
    const checkout = await this.provider.createCheckout({
      orderId,
      orderCode: order.code,
      amountMinor: order.totalMinor,
      currency: order.currency,
      buyerEmail,
      callbackUrl: `${env.get('APP_URL')}/orders/${orderId}`,
    })

    const payment = await Payment.create({
      orderId,
      provider: this.provider.name,
      providerRef: checkout.providerRef,
      status: 'pending',
      amountMinor: order.totalMinor,
      refundedMinor: 0,
      currency: order.currency,
    })
    return { payment, redirectUrl: checkout.redirectUrl }
  }

  /**
   * Verifies, dedupes (provider event id) and applies a provider webhook. Everything happens in
   * one transaction, so a failure rolls the dedup row back and the provider's retry re-processes.
   */
  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<WebhookOutcome> {
    const event = await this.provider.handleWebhook(rawBody, headers)

    const result = await db.transaction(async (trx) => {
      const inserted = await trx
        .table('payment_webhooks')
        .insert({
          provider: this.provider.name,
          provider_event_id: event.eventId,
          type: event.type,
          payload: JSON.stringify(event.raw),
          received_at: new Date(),
        })
        .onConflict(['provider', 'provider_event_id'])
        .ignore()
        .returning('id')
      if (inserted.length === 0) return null

      const applied = await this.apply(event, trx)
      if (applied.review) {
        await AuditLog.create(
          {
            action: 'payment.needs_review',
            subjectType: 'payment',
            subjectId: 0,
            meta: {
              eventId: event.eventId,
              providerRef: event.providerRef,
              reason: applied.review,
            },
          },
          { client: trx }
        )
      }
      await trx
        .from('payment_webhooks')
        .where('provider', this.provider.name)
        .where('provider_event_id', event.eventId)
        .update({ processed_at: new Date() })
      return applied
    })

    if (!result) return { status: 'duplicate' }
    if (result.review) {
      logger.error({ msg: 'payment webhook needs manual review', reason: result.review })
    }

    if (result.paidOrderId) {
      await this.notifier.paymentReceived(result.paidOrderId)
      await this.trackPaid(result.paidOrderId)
      try {
        const { hold } = await new FraudService().assess(result.paidOrderId)
        if (hold) {
          logger.warn({ msg: 'order held for fraud review', orderId: result.paidOrderId })
        } else {
          await this.startMatching(result.paidOrderId)
        }
      } catch (error) {
        logger.error({ msg: 'matching failed to start', orderId: result.paidOrderId, error })
      }
    }
    if (result.orphanOrderId) await this.settleRefunds(result.orphanOrderId)
    return { status: 'processed', paidOrderId: result.paidOrderId }
  }

  /** Funnel step "order paid", credited to the buyer's first touch. Never blocks the payment. */
  private async trackPaid(orderId: number) {
    try {
      const order = await Order.findOrFail(orderId)
      const buyer = await User.findOrFail(order.buyerId)
      const growth = new GrowthService()
      await growth.track('order_paid', growth.firstTouchOf(buyer))
    } catch (error) {
      logger.warn({ msg: 'order_paid tracking failed', orderId, error: (error as Error).message })
    }
  }

  private async apply(event: WebhookEvent, trx: TransactionClientContract): Promise<Applied> {
    const none: Applied = { paidOrderId: null, orphanOrderId: null }

    if (event.type === 'refund.succeeded') return none // refunds are settled synchronously

    if (event.type === 'chargeback.opened') {
      const disputed = await Payment.query({ client: trx })
        .where('provider', this.provider.name)
        .where('providerRef', event.providerRef)
        .first()
      if (!disputed)
        return { ...none, review: `chargeback for unknown payment ${event.providerRef}` }
      await Chargeback.create(
        {
          orderId: disputed.orderId,
          paymentId: disputed.id,
          providerEventId: event.eventId,
          amountMinor: event.amountMinor,
          currency: disputed.currency,
          status: 'open',
        },
        { client: trx }
      )
      await AuditLog.create(
        {
          action: 'payment.chargeback_opened',
          subjectType: 'order',
          subjectId: disputed.orderId,
          meta: { eventId: event.eventId, amountMinor: event.amountMinor },
        },
        { client: trx }
      )
      return none
    }

    const payment = await Payment.query({ client: trx })
      .where('provider', this.provider.name)
      .where('providerRef', event.providerRef)
      .forUpdate()
      .first()
    if (!payment) return { ...none, review: `unknown payment ${event.providerRef}` }
    // a late `succeeded` after `failed` still means money was taken: accept it
    const lateSuccess = payment.status === 'failed' && event.type === 'payment.succeeded'
    if (payment.status !== 'pending' && !lateSuccess) return none

    if (event.type === 'payment.failed') {
      payment.status = 'failed'
      await payment.useTransaction(trx).save()
      return none
    }

    if (event.amountMinor !== payment.amountMinor) {
      return {
        ...none,
        review: `amount mismatch on ${payment.providerRef}: expected ${payment.amountMinor}, got ${event.amountMinor}`,
      }
    }

    payment.status = 'succeeded'
    await payment.useTransaction(trx).save()
    await this.ledger.post(
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: payment.amountMinor },
        { account: 'buyer_escrow', direction: 'credit', amountMinor: payment.amountMinor },
      ],
      { orderId: payment.orderId, currency: payment.currency, memo: 'payment captured', trx }
    )

    const order = await Order.query({ client: trx })
      .where('id', payment.orderId)
      .forUpdate()
      .firstOrFail()
    if (order.status === 'awaiting_payment') {
      await this.sm.transition(order.id, 'paid', {
        trx,
        actorId: order.buyerId,
        meta: { provider: this.provider.name, paymentId: payment.id },
      })
      return { paidOrderId: order.id, orphanOrderId: null }
    }

    // Money arrived for an order that can no longer take it (cancelled, or paid by another
    // checkout): give it back instead of silently keeping it.
    await AuditLog.create(
      {
        action: 'payment.orphaned',
        subjectType: 'order',
        subjectId: order.id,
        meta: { paymentId: payment.id, orderStatus: order.status },
      },
      { client: trx }
    )
    await this.recordRefundObligation(
      order.id,
      payment.amountMinor,
      payment.currency,
      trx,
      payment.id
    )
    return { paidOrderId: null, orphanOrderId: order.id }
  }

  /** Moves escrowed money into the `refund` account: we owe it back to the buyer. */
  async recordRefundObligation(
    orderId: number,
    amountMinor: number,
    currency: string,
    trx: TransactionClientContract,
    paymentId?: number
  ) {
    const escrow = await this.ledger.balance('buyer_escrow', { orderId, currency, trx })
    if (amountMinor > escrow) {
      throw new PaymentError(`Refund ${amountMinor} exceeds escrow balance ${escrow}`)
    }
    await this.ledger.post(
      [
        { account: 'buyer_escrow', direction: 'debit', amountMinor },
        { account: 'refund', direction: 'credit', amountMinor },
      ],
      {
        orderId,
        currency,
        memo: paymentId ? `refund owed payment:${paymentId}` : 'refund owed to buyer',
        trx,
      }
    )
  }

  /**
   * Pays out what is owed in the `refund` account, one obligation (ledger transaction) at a
   * time under a per-order advisory lock. The provider idempotency key is derived from the
   * obligation itself, so a retry after a crash or timeout re-sends the identical request and
   * can never refund twice, even if new obligations arrived in between.
   */
  async settleRefunds(orderId: number): Promise<number> {
    let total = 0
    const paid: Array<{ amount: number; refundedTotal: number }> = []
    await db.transaction(async (trx) => {
      await trx.rawQuery('select pg_advisory_xact_lock(?)', [orderId])

      const credits = await trx
        .from('ledger_entries')
        .where('order_id', orderId)
        .where('account', 'refund')
        .where('direction', 'credit')
        .orderBy('id', 'asc')
        .select('transaction_id', 'amount_minor', 'currency', 'memo')
      const settledRow = await trx
        .from('ledger_entries')
        .where('order_id', orderId)
        .where('account', 'refund')
        .where('direction', 'debit')
        .sum('amount_minor as total')
        .first()
      let settled = Number(settledRow?.total ?? 0)

      for (const entry of credits) {
        const size = Number(entry.amount_minor)
        if (settled >= size) {
          settled -= size
          continue
        }
        const amount = size - settled
        const key = `refund:${entry.transaction_id}:${settled}`
        settled = 0

        const pinned = /payment:(\d+)/.exec(entry.memo ?? '')
        const query = Payment.query({ client: trx })
          .where('orderId', orderId)
          .whereIn('status', ['succeeded', 'partially_refunded'])
          .forUpdate()
        if (pinned) query.where('id', Number(pinned[1]))
        const payment = await query.orderBy('id', 'asc').firstOrFail()
        if (payment.amountMinor - payment.refundedMinor < amount) {
          throw new PaymentError(`Refund ${amount} exceeds what is left on ${payment.providerRef}`)
        }

        await this.provider.refund({
          providerRef: payment.providerRef,
          amountMinor: amount,
          currency: entry.currency,
          idempotencyKey: key,
        })

        payment.refundedMinor += amount
        payment.status =
          payment.refundedMinor >= payment.amountMinor ? 'refunded' : 'partially_refunded'
        await payment.useTransaction(trx).save()
        await this.ledger.post(
          [
            { account: 'refund', direction: 'debit', amountMinor: amount },
            { account: 'provider_cash', direction: 'credit', amountMinor: amount },
          ],
          { orderId, currency: entry.currency, memo: 'refund paid to buyer', trx }
        )
        await AuditLog.create(
          {
            action: 'payment.refunded',
            subjectType: 'order',
            subjectId: orderId,
            meta: { paymentId: payment.id, amountMinor: amount, at: DateTime.now().toISO() },
          },
          { client: trx }
        )
        total += amount
        paid.push({ amount, refundedTotal: payment.refundedMinor })
      }
    })
    for (const refund of paid) {
      await this.notifier.refundIssued(orderId, refund.amount, refund.refundedTotal)
    }
    return total
  }

  /**
   * Dev-only stand-in for the buyer completing 3DS at the provider: checkout, then a signed
   * `payment.succeeded` delivered through the real webhook path.
   */
  async simulateSuccess(orderId: number, buyerId: number) {
    if (!(app.inDev || app.inTest) || !(this.provider instanceof FakePaymentProvider)) {
      throw new PaymentError('Payment simulation is only available with the fake provider')
    }
    const { payment } = await this.startCheckout(orderId, buyerId)
    const { body, headers } = this.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    return this.handleWebhook(body, headers)
  }
}
