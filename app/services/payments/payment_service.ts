import GrowthService from '#services/growth/growth_service'
import { DRAFT_HOLD_HOURS } from '#services/pricing/coupon_service'
import fabrmatchConfig from '#config/fabrmatch'
import { BASE_CURRENCY } from '#services/pricing/fx'
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
import OrderService from '#services/orders/order_service'
import { isValidTckn } from '#services/identity/tax_ids'
import { paymentProvider } from '#services/payments/provider_registry'
import { salesModel } from '#services/payments/sales_model'
import type { CheckoutRequest, PaymentProvider, WebhookEvent } from '#services/payments/provider'
import type { ShippingAddress } from '#services/orders/order_service'

export class PaymentError extends DomainError {}

export const MIN_TOP_UP_MINOR = 10_000
export const MAX_TOP_UP_MINOR = 10_000_000

/** Asked at the pay step for providers that need them; nothing here is stored. */
export interface PayerDetails {
  identityNumber?: string
  phone?: string
  ip?: string
}

/**
 * Turkish addresses need a TCKN (11 digits, official checksum); anyone else passes their own
 * identity or passport number, which iyzico also requires.
 */
export function validIdentityNumber(value: string, country: string): boolean {
  if (country.toUpperCase() !== 'TR') return /^[A-Za-z0-9]{5,20}$/.test(value)
  return isValidTckn(value)
}

/** E.164-ish: Turkish local forms (05xx…, 5xx…) get +90, anything else keeps its own prefix. */
export function normalizePhone(value: string, country: string): string | null {
  const digits = value.replace(/[^\d+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) return digits.length >= 8 ? digits : null
  if (country.toUpperCase() === 'TR') {
    const local = digits.replace(/^(90|0)/, '')
    return /^5\d{9}$/.test(local) ? `+90${local}` : null
  }
  return digits.length >= 8 ? `+${digits}` : null
}

export type WebhookOutcome =
  { status: 'duplicate' } | { status: 'processed'; paidOrderId: string | null }

interface Applied {
  paidOrderId: string | null
  /** Order that received money it cannot take — refunded after commit. */
  orphanOrderId: string | null
  /** Event we could not apply safely: recorded for an admin instead of retried forever. */
  review?: string
}

type StartMatching = (orderId: string) => Promise<unknown>

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

  /**
   * A price is only good for so long (review fix): a draft older than the coupon hold no longer
   * holds its coupon use (someone else may have taken it), and a foreign-currency order must not
   * be paid at a rate older than the allowed FX age. The buyer places the order again instead.
   */
  private async assertPriceStillValid(order: Order, trx: TransactionClientContract) {
    const stale = () =>
      new PaymentError('The price of this order is no longer up to date. Please place it again.')
    const age = DateTime.now().diff(order.createdAt, 'hours').hours
    if (order.status === 'draft' && age > DRAFT_HOLD_HOURS) {
      const redemption = await trx.from('coupon_redemptions').where('order_id', order.id).first()
      if (redemption) throw stale()
    }
    if (order.currency !== BASE_CURRENCY && age > fabrmatchConfig.pricing.fxMaxAgeHours) {
      throw stale()
    }
  }

  /**
   * draft → awaiting_payment and a provider checkout session for the full order total. Hosted
   * pages that need the buyer's identity (iyzico) get the identity number and phone asked at the
   * pay step; the identity number goes straight to the provider and is never stored.
   */
  async startCheckout(orderId: string, buyerId: string, payer: PayerDetails = {}) {
    const needsIdentity = this.provider.needsBuyerIdentity === true
    const buyerEmail = await db.transaction(async (trx) => {
      const order = await Order.query({ client: trx })
        .where('id', orderId)
        .where('buyerId', buyerId)
        .preload('buyer')
        .forUpdate()
        .first()
      if (!order) throw new PaymentError('Order not found')

      await this.assertPriceStillValid(order, trx)
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
      // hosted pages POST the buyer back here; the order page itself is the fake provider's return
      callbackUrl: needsIdentity
        ? `${env.get('APP_URL')}/payments/return`
        : `${env.get('APP_URL')}/orders/${orderId}`,
      ...(needsIdentity ? this.buyerDetails(order, buyerId, buyerEmail, payer) : {}),
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
   * Seller wallet top-up (R4-T2): a hosted checkout like an order's, but the money becomes the
   * seller's balance. Hosted pages that need the buyer's identity also need a billing address.
   */
  async startTopUp(
    user: User,
    amountMinor: number,
    payer: PayerDetails = {},
    billing: ShippingAddress | null = null
  ) {
    if (
      !Number.isInteger(amountMinor) ||
      amountMinor < MIN_TOP_UP_MINOR ||
      amountMinor > MAX_TOP_UP_MINOR
    ) {
      throw new PaymentError('Top up between 100 and 100,000 TRY')
    }
    if (salesModel() !== 'merchant_of_record') {
      throw new PaymentError('The balance is only available when Fabrmatch sells')
    }
    const needsIdentity = this.provider.needsBuyerIdentity === true
    if (needsIdentity && !billing) throw new PaymentError('Enter your billing address')
    const reference = `WT-${Date.now().toString(36).toUpperCase()}`
    const checkout = await this.provider.createCheckout({
      orderId: null,
      orderCode: reference,
      amountMinor,
      currency: 'TRY',
      buyerEmail: user.email,
      callbackUrl: needsIdentity
        ? `${env.get('APP_URL')}/payments/return`
        : `${env.get('APP_URL')}/seller/wallet`,
      ...(needsIdentity
        ? this.hostedPageDetails(billing!, user.id, user.email, payer, [
            { id: 'production' as const, name: 'Fabrmatch balance', priceMinor: amountMinor },
          ])
        : {}),
    })
    const payment = await Payment.create({
      walletUserId: user.id,
      orderId: null,
      provider: this.provider.name,
      providerRef: checkout.providerRef,
      status: 'pending',
      amountMinor,
      refundedMinor: 0,
      currency: 'TRY',
    })
    return { payment, redirectUrl: checkout.redirectUrl }
  }

  /**
   * Pays an order of the buyer's from their wallet balance: one transaction under a per-user
   * lock, so two orders can never spend the same money. TRY only.
   */
  async payFromWallet(orderId: string, buyerId: string) {
    if (salesModel() !== 'merchant_of_record') {
      throw new PaymentError('The balance is only available when Fabrmatch sells')
    }
    const paid = await db.transaction(async (trx) => {
      await trx.rawQuery('select pg_advisory_xact_lock(hashtext(?))', [`wallet:${buyerId}`])
      const order = await Order.query({ client: trx })
        .where('id', orderId)
        .where('buyerId', buyerId)
        .forUpdate()
        .first()
      if (!order) throw new PaymentError('Order not found', { status: 404 })
      if (order.currency !== 'TRY') throw new PaymentError('The balance pays TRY orders only')
      if (!['draft', 'awaiting_payment'].includes(order.status)) {
        throw new PaymentError('This order cannot be paid in its current state')
      }
      await this.assertPriceStillValid(order, trx)
      const balance = await this.ledger.balance('seller_wallet', {
        walletUserId: buyerId,
        currency: 'TRY',
        trx,
      })
      if (balance < order.totalMinor) {
        throw new PaymentError('Your balance is not enough for this order')
      }
      if (order.status === 'draft') {
        await this.sm.transition(order.id, 'awaiting_payment', { trx, actorId: buyerId })
      }
      const payment = await Payment.create(
        {
          orderId: order.id,
          walletUserId: null,
          provider: 'wallet',
          providerRef: `wallet:${order.id}:${Date.now()}`,
          status: 'succeeded',
          amountMinor: order.totalMinor,
          refundedMinor: 0,
          currency: 'TRY',
        },
        { client: trx }
      )
      await this.ledger.post(
        [
          {
            account: 'seller_wallet',
            direction: 'debit',
            amountMinor: order.totalMinor,
            walletUserId: buyerId,
          },
          { account: 'buyer_escrow', direction: 'credit', amountMinor: order.totalMinor },
        ],
        { orderId: order.id, currency: 'TRY', memo: `paid from wallet payment:${payment.id}`, trx }
      )
      await this.sm.transition(order.id, 'paid', {
        trx,
        actorId: buyerId,
        meta: { provider: 'wallet', paymentId: payment.id },
      })
      return order.id
    })
    await this.afterPaid(paid)
    return paid
  }

  /**
   * Gives the seller's remaining balance back to the card(s) it came from, newest top-up first.
   * Each chunk has an idempotency key derived from the top-up and what was already refunded on
   * it, so a retry after a crash re-sends the same request and never refunds twice.
   */
  async refundWalletBalance(userId: string): Promise<number> {
    let refunded = 0
    await db.transaction(async (trx) => {
      await trx.rawQuery('select pg_advisory_xact_lock(hashtext(?))', [`wallet:${userId}`])
      let remaining = await this.ledger.balance('seller_wallet', {
        walletUserId: userId,
        currency: 'TRY',
        trx,
      })
      if (remaining <= 0) throw new PaymentError('There is no balance to refund')
      const topUps = await Payment.query({ client: trx })
        .where('walletUserId', userId)
        .whereIn('status', ['succeeded', 'partially_refunded'])
        .orderBy('id', 'desc')
        .forUpdate()
      for (const payment of topUps) {
        if (remaining <= 0) break
        const chunk = Math.min(remaining, payment.amountMinor - payment.refundedMinor)
        if (chunk <= 0) continue
        await this.provider.refund({
          providerRef: payment.providerRef,
          amountMinor: chunk,
          currency: payment.currency,
          idempotencyKey: `wallet-refund:${payment.id}:${payment.refundedMinor}`,
        })
        payment.refundedMinor += chunk
        payment.status =
          payment.refundedMinor >= payment.amountMinor ? 'refunded' : 'partially_refunded'
        await payment.useTransaction(trx).save()
        await this.ledger.post(
          [
            {
              account: 'seller_wallet',
              direction: 'debit',
              amountMinor: chunk,
              walletUserId: userId,
            },
            { account: 'provider_cash', direction: 'credit', amountMinor: chunk },
          ],
          { currency: payment.currency, memo: `wallet refund payment:${payment.id}`, trx }
        )
        remaining -= chunk
        refunded += chunk
      }
      await AuditLog.create(
        {
          actorId: userId,
          action: 'wallet.refunded',
          subjectType: 'user',
          subjectId: userId,
          meta: { refundedMinor: refunded, left: remaining },
        },
        { client: trx }
      )
    })
    return refunded
  }

  /** Buyer, address and payout lines for a hosted page that needs them (iyzico). */
  private buyerDetails(order: Order, buyerId: string, email: string, payer: PayerDetails) {
    const address = new OrderService().decryptShippingAddress(order)
    if (!address) throw new PaymentError('This order has no shipping address')
    const sellerShare = order.sellerId ? order.sellerShareMinor : 0
    return this.hostedPageDetails(address, buyerId, email, payer, [
      {
        id: 'production' as const,
        name: `3D print ${order.code}`,
        priceMinor: order.totalMinor - sellerShare,
      },
      ...(sellerShare > 0
        ? [{ id: 'seller' as const, name: `Product ${order.code}`, priceMinor: sellerShare }]
        : []),
    ])
  }

  private hostedPageDetails(
    address: ShippingAddress,
    buyerId: string,
    email: string,
    payer: PayerDetails,
    items: NonNullable<CheckoutRequest['items']>
  ) {
    const phone = normalizePhone(payer.phone || address.phone || '', address.country)
    if (!phone) throw new PaymentError('Add a phone number to pay', { status: 422 })
    if (!validIdentityNumber(payer.identityNumber ?? '', address.country)) {
      throw new PaymentError('Enter a valid identity number to pay', { status: 422 })
    }

    const words = address.fullName.trim().split(/\s+/)
    const surname = words.length > 1 ? words.pop()! : words[0]
    const street = [address.line1, address.line2, address.district].filter(Boolean).join(', ')
    return {
      buyer: {
        id: String(buyerId),
        name: words.join(' '),
        surname,
        email,
        gsmNumber: phone,
        identityNumber: payer.identityNumber!,
        ip: payer.ip ?? '127.0.0.1',
      },
      shippingAddress: {
        contactName: address.fullName,
        address: street,
        city: address.city,
        country: address.country,
        zipCode: address.postalCode || undefined,
      },
      items,
    }
  }

  /**
   * The buyer came back from the provider's hosted page. The outcome is read from the provider,
   * then applied through the same idempotent path as the webhook (whichever arrives first wins).
   * Returns the order to show; `pending` while the provider has not decided yet.
   */
  async confirmReturn(fields: Record<string, unknown>) {
    if (!this.provider.confirmReturn) throw new PaymentError('Not supported by this provider')
    const event = await this.provider.confirmReturn(fields)
    const providerRef = event?.providerRef ?? String(fields.token ?? '')
    const payment = await Payment.query()
      .where('provider', this.provider.name)
      .where('providerRef', providerRef)
      .first()
    if (!payment) throw new PaymentError('Payment not found', { status: 404 })
    if (event) await this.process(event)
    return {
      orderId: payment.orderId,
      walletTopUp: payment.walletUserId !== null,
      outcome: !event ? 'pending' : event.type === 'payment.succeeded' ? 'paid' : 'failed',
    } as const
  }

  /**
   * Safety net for buyers who close the tab after paying: pending hosted checkouts are looked
   * up at the provider and applied like a callback. Returns how many were settled.
   */
  async syncPending(olderThanMinutes = 5): Promise<number> {
    if (!this.provider.confirmReturn) return 0
    const pending = await Payment.query()
      .where('provider', this.provider.name)
      .where('status', 'pending')
      .where('createdAt', '<', DateTime.now().minus({ minutes: olderThanMinutes }).toSQL()!)
      .where('createdAt', '>', DateTime.now().minus({ days: 2 }).toSQL()!)
    let settled = 0
    for (const payment of pending) {
      try {
        const event = await this.provider.confirmReturn({ token: payment.providerRef })
        if (!event) continue
        await this.process(event)
        settled++
      } catch (error) {
        logger.warn({
          msg: 'pending payment sync failed',
          paymentId: payment.id,
          error: (error as Error).message,
        })
      }
    }
    return settled
  }

  /**
   * Verifies, dedupes (provider event id) and applies a provider webhook. Everything happens in
   * one transaction, so a failure rolls the dedup row back and the provider's retry re-processes.
   */
  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<WebhookOutcome> {
    return this.process(await this.provider.handleWebhook(rawBody, headers))
  }

  private async process(event: WebhookEvent): Promise<WebhookOutcome> {
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
            subjectId: null,
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

    if (result.paidOrderId) await this.afterPaid(result.paidOrderId)
    if (result.orphanOrderId) await this.settleRefunds(result.orphanOrderId)
    return { status: 'processed', paidOrderId: result.paidOrderId }
  }

  /** After commit: tell the buyer, count it, check for fraud, then look for a maker. */
  private async afterPaid(orderId: string) {
    await this.notifier.paymentReceived(orderId)
    await this.trackPaid(orderId)
    try {
      const { hold } = await new FraudService().assess(orderId)
      if (hold) {
        logger.warn({ msg: 'order held for fraud review', orderId })
      } else {
        await this.startMatching(orderId)
      }
    } catch (error) {
      logger.error({ msg: 'matching failed to start', orderId, error })
    }
  }

  /** Funnel step "order paid", credited to the buyer's first touch. Never blocks the payment. */
  private async trackPaid(orderId: string) {
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

    // refunds are settled synchronously; `ignored` deliveries are only recorded for dedup
    if (event.type === 'refund.succeeded' || event.type === 'ignored') return none

    if (event.type === 'chargeback.opened') {
      const disputed = await Payment.query({ client: trx })
        .where('provider', this.provider.name)
        .where('providerRef', event.providerRef)
        .first()
      if (!disputed)
        return { ...none, review: `chargeback for unknown payment ${event.providerRef}` }
      if (!disputed.orderId) {
        return { ...none, review: `chargeback on wallet top-up ${disputed.providerRef}` }
      }
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

    if (event.currency && event.currency !== payment.currency) {
      return {
        ...none,
        review: `currency mismatch on ${payment.providerRef}: expected ${payment.currency}, got ${event.currency}`,
      }
    }
    if (event.amountMinor !== payment.amountMinor) {
      return {
        ...none,
        review: `amount mismatch on ${payment.providerRef}: expected ${payment.amountMinor}, got ${event.amountMinor}`,
      }
    }

    payment.status = 'succeeded'
    await payment.useTransaction(trx).save()

    // a wallet top-up: the money becomes the seller's balance, nothing else happens
    if (payment.walletUserId) {
      await this.ledger.post(
        [
          { account: 'provider_cash', direction: 'debit', amountMinor: payment.amountMinor },
          {
            account: 'seller_wallet',
            direction: 'credit',
            amountMinor: payment.amountMinor,
            walletUserId: payment.walletUserId,
          },
        ],
        { currency: payment.currency, memo: `wallet top-up payment:${payment.id}`, trx }
      )
      await AuditLog.create(
        {
          actorId: payment.walletUserId,
          action: 'wallet.topped_up',
          subjectType: 'user',
          subjectId: payment.walletUserId,
          meta: { paymentId: payment.id, amountMinor: payment.amountMinor },
        },
        { client: trx }
      )
      return none
    }

    await this.ledger.post(
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: payment.amountMinor },
        { account: 'buyer_escrow', direction: 'credit', amountMinor: payment.amountMinor },
      ],
      { orderId: payment.orderId!, currency: payment.currency, memo: 'payment captured', trx }
    )

    const order = await Order.query({ client: trx })
      .where('id', payment.orderId!)
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
    orderId: string,
    amountMinor: number,
    currency: string,
    trx: TransactionClientContract,
    paymentId?: string
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
  async settleRefunds(orderId: string): Promise<number> {
    let total = 0
    const paid: Array<{ amount: number; refundedTotal: number }> = []
    await db.transaction(async (trx) => {
      await trx.rawQuery('select pg_advisory_xact_lock(hashtext(?))', [`order:${orderId}`])

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

        const pinned = /payment:([0-9a-f-]{36})/i.exec(entry.memo ?? '')
        const query = Payment.query({ client: trx })
          .where('orderId', orderId)
          .whereIn('status', ['succeeded', 'partially_refunded'])
          .forUpdate()
        if (pinned) query.where('id', pinned[1])
        const payment = await query.orderBy('id', 'asc').firstOrFail()
        if (payment.amountMinor - payment.refundedMinor < amount) {
          throw new PaymentError(`Refund ${amount} exceeds what is left on ${payment.providerRef}`)
        }

        // paid from the balance: the money goes back to the balance, no provider involved
        const toWallet = payment.provider === 'wallet'
        if (!toWallet) {
          await this.provider.refund({
            providerRef: payment.providerRef,
            amountMinor: amount,
            currency: entry.currency,
            idempotencyKey: key,
          })
        }

        payment.refundedMinor += amount
        payment.status =
          payment.refundedMinor >= payment.amountMinor ? 'refunded' : 'partially_refunded'
        await payment.useTransaction(trx).save()
        const walletOwner = toWallet ? await Order.findOrFail(orderId, { client: trx }) : null
        const buyerId = walletOwner?.buyerId
        await this.ledger.post(
          [
            { account: 'refund', direction: 'debit', amountMinor: amount },
            toWallet
              ? {
                  account: 'seller_wallet',
                  direction: 'credit',
                  amountMinor: amount,
                  walletUserId: buyerId,
                }
              : { account: 'provider_cash', direction: 'credit', amountMinor: amount },
          ],
          {
            orderId,
            currency: entry.currency,
            memo: toWallet ? 'refund back to wallet' : 'refund paid to buyer',
            trx,
          }
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
  async simulateSuccess(orderId: string, buyerId: string) {
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
