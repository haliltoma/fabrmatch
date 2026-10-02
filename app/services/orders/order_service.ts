import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import type { OrderChannel, OrderStatus } from '#models/order'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import fabrmatchConfig from '#config/fabrmatch'
import MatchOffer, { OPEN_OFFER_STATUSES } from '#models/match_offer'
import LedgerService from '#services/payments/ledger_service'
import OrderNotifier from '#services/notifications/order_notifier'
import PaymentService from '#services/payments/payment_service'
import OrderStateMachine, {
  InvalidOrderTransitionError,
} from '#services/orders/order_state_machine'
import OrderItem from '#models/order_item'
import ModelFile from '#models/model_file'
import SellerProduct from '#models/seller_product'
import type { PrinterTechnology } from '#models/printer'
import type User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import CouponService, { CouponError } from '#services/pricing/coupon_service'
import { paymentProvider } from '#services/payments/provider_registry'
import { requiredTierForTotal } from '#services/manufacturing/trust_tier_service'
import { OrderInputError, priceOrder } from '#services/orders/order_pricing'
import { pageMeta, pageParams } from '#services/pagination'

export interface ShippingAddress {
  fullName: string
  line1: string
  line2?: string | null
  city: string
  district?: string | null
  postalCode: string
  country: string
  phone?: string | null
}

export interface CreateDraftInput {
  modelFileId: string
  material: string
  technology?: PrinterTechnology
  color?: string | null
  quantity: number
  infill?: number
  /** Named quality preset; sets technology, infill and print-time factor. */
  printProfileId?: string | null
  finishing?: string | null
  finishingColour?: string | null
  shippingAddress: ShippingAddress
  channel?: OrderChannel
  sellerId?: string | null
  sellerMarginBps?: number
  /** buyer's currency; TRY unless an admin enabled others */
  currency?: string
  couponCode?: string
}

export { OrderInputError }

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateOrderCode(): string {
  const bytes = randomBytes(8)
  let code = 'FO-'
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return code
}

export default class OrderService {
  private encryption = new EncryptionService()
  private sm = new OrderStateMachine()
  private ledger = new LedgerService()
  private notifier = new OrderNotifier()
  private injectedPayments: PaymentService | null

  constructor(payments: PaymentService | null = null) {
    this.injectedPayments = payments
  }

  // Lazy: order reads/drafts never need a payment provider.
  private get payments(): PaymentService {
    return (this.injectedPayments ??= new PaymentService())
  }

  async createDraft(buyer: User, input: CreateDraftInput): Promise<Order> {
    return this.createDraftForItems(buyer, {
      items: [input],
      shippingAddress: input.shippingAddress,
      channel: input.channel,
      sellerId: input.sellerId,
      sellerMarginBps: input.sellerMarginBps,
      currency: input.currency,
      couponCode: input.couponCode,
    })
  }

  /** One order, several lines (cart checkout). The buyer must own every model file. */
  async createDraftForItems(
    buyer: User,
    input: {
      items: Array<Omit<CreateDraftInput, 'shippingAddress'>>
      shippingAddress: ShippingAddress
      channel?: OrderChannel
      sellerId?: string | null
      sellerMarginBps?: number
      currency?: string
      couponCode?: string
    }
  ): Promise<Order> {
    const ids = [...new Set(input.items.map((i) => i.modelFileId))]
    const files = await ModelFile.query().whereIn('id', ids).where('ownerId', buyer.id)
    const byId = new Map(files.map((f) => [f.id, f]))
    return this.persistDraft(
      buyer,
      input.items.map((i) => ({ ...i, file: byId.get(i.modelFileId) ?? null })),
      input
    )
  }

  /**
   * Storefront purchase: the model comes from the catalog product (owned by the platform), the
   * seller is the product's owner and earns the product's margin. Prices are recomputed here
   * from the current reference price list — nothing price-related is taken from the client.
   */
  async createStorefrontDraft(
    buyer: User,
    productId: string,
    input: Pick<
      CreateDraftInput,
      | 'material'
      | 'color'
      | 'quantity'
      | 'shippingAddress'
      | 'currency'
      | 'couponCode'
      | 'finishing'
      | 'finishingColour'
    > & {
      scalePercent?: number
    }
  ): Promise<Order> {
    const product = await SellerProduct.query()
      .where('id', productId)
      .where('status', 'active')
      .preload('sellerProfile')
      .preload('catalogProduct')
      .first()
    const catalog = product?.catalogProduct
    if (!product || !catalog || !catalog.isActive || !catalog.modelFileId) {
      throw new OrderInputError('Product not available')
    }
    if (!catalog.allowedMaterials.map((m) => m.toUpperCase()).includes(input.material)) {
      throw new OrderInputError(`Material ${input.material} is not available for this product`)
    }
    const scale = input.scalePercent ?? 100
    if (!(catalog.allowedScales ?? [100]).includes(scale)) {
      throw new OrderInputError('That size is not offered for this product')
    }
    const file = await ModelFile.find(catalog.modelFileId)
    return this.persistDraft(buyer, [{ ...input, file }], {
      shippingAddress: input.shippingAddress,
      channel: 'storefront',
      sellerId: product.sellerProfile.userId,
      sellerMarginBps: product.marginBps,
      minMakerTier: product.minMakerTier,
      currency: input.currency,
      couponCode: input.couponCode,
    })
  }

  /**
   * A seller orders one piece of their own design to check it before selling: production cost only,
   * no margin, no seller share. The order behaves like any other (payment, matching, dispute).
   */
  async createSampleDraft(
    seller: User,
    sellerProductId: string,
    input: Pick<CreateDraftInput, 'material' | 'color' | 'shippingAddress'>
  ): Promise<Order> {
    const product = await SellerProduct.query()
      .where('id', sellerProductId)
      .preload('sellerProfile')
      .preload('catalogProduct')
      .first()
    if (!product || product.sellerProfile.userId !== seller.id) {
      throw new OrderInputError('Product not found')
    }
    const catalog = product.catalogProduct
    if (!catalog || !catalog.isActive || !catalog.modelFileId) {
      throw new OrderInputError('This design is not available')
    }
    if (!catalog.allowedMaterials.map((m) => m.toUpperCase()).includes(input.material)) {
      throw new OrderInputError(`Material ${input.material} is not available for this product`)
    }
    const file = await ModelFile.find(catalog.modelFileId)
    return this.persistDraft(seller, [{ ...input, quantity: 1, file }], {
      shippingAddress: input.shippingAddress,
      channel: 'sample',
      sellerId: null,
      sellerMarginBps: 0,
    })
  }

  /**
   * An order from the seller's own shop (R4): the seller already sold it there, so they are the
   * buyer here and pay the production cost; no margin, no seller share. Ships to their customer.
   */
  async createExternalDraft(
    seller: User,
    lines: Array<{
      sellerProductId: string
      material: string
      color: string | null
      scalePercent: number | null
      quantity: number
    }>,
    shippingAddress: ShippingAddress,
    channel: 'shopify' | 'etsy' | 'woocommerce'
  ): Promise<Order> {
    const items = []
    for (const line of lines) {
      const product = await SellerProduct.query()
        .where('id', line.sellerProductId)
        .preload('sellerProfile')
        .preload('catalogProduct')
        .first()
      if (!product || product.sellerProfile.userId !== seller.id) {
        throw new OrderInputError('Product not found')
      }
      const catalog = product.catalogProduct
      if (!catalog || !catalog.isActive || !catalog.modelFileId) {
        throw new OrderInputError(`"${product.title}" is not available`)
      }
      if (!catalog.allowedMaterials.map((m) => m.toUpperCase()).includes(line.material)) {
        throw new OrderInputError(
          `Material ${line.material} is not available for "${product.title}"`
        )
      }
      const scale = line.scalePercent ?? 100
      if (!(catalog.allowedScales ?? [100]).includes(scale)) {
        throw new OrderInputError(`That size is not offered for "${product.title}"`)
      }
      const file = await ModelFile.find(catalog.modelFileId)
      items.push({
        material: line.material,
        color: line.color,
        quantity: line.quantity,
        scalePercent: scale,
        file,
      })
    }
    return this.persistDraft(seller, items, {
      shippingAddress,
      channel,
      sellerId: null,
      sellerMarginBps: 0,
    })
  }

  /** A buyer may only be offered a currency the payment provider can actually settle. */
  private assertProviderSettles(currency: string) {
    const supported = paymentProvider().supportedCurrencies ?? ['TRY']
    if (!supported.includes(currency)) {
      throw new OrderInputError(`Payments in ${currency} are not available`)
    }
  }

  private async persistDraft(
    buyer: User,
    lines: Array<
      Omit<CreateDraftInput, 'shippingAddress' | 'modelFileId'> & { file: ModelFile | null }
    >,
    input: {
      shippingAddress: ShippingAddress
      channel?: OrderChannel
      sellerId?: string | null
      sellerMarginBps?: number
      minMakerTier?: number
      currency?: string
      couponCode?: string
    }
  ): Promise<Order> {
    const currency = (input.currency ?? 'TRY').toUpperCase()
    if (currency !== 'TRY') this.assertProviderSettles(currency)
    const coupons = new CouponService()
    const coupon = input.couponCode ? await coupons.resolve(input.couponCode, buyer) : null
    const priced = await priceOrder({
      coupon: coupon ?? undefined,
      items: lines,
      country: input.shippingAddress.country,
      hasSeller: !!input.sellerId,
      sellerMarginBps: input.sellerMarginBps,
      currency,
    })

    if (coupon && priced.discountMinor === 0) {
      throw new CouponError('This code does not apply to this order')
    }

    return db.transaction(async (trx) => {
      // lock the coupon and re-check its limits: two orders must not both take the last redemption
      const locked =
        coupon && input.couponCode ? await coupons.resolve(input.couponCode, buyer, trx) : null
      const order = await Order.create(
        {
          code: generateOrderCode(),
          channel: input.channel ?? 'direct',
          buyerId: buyer.id,
          sellerId: input.sellerId ?? null,
          status: 'draft',
          currency: priced.currency,
          fxRateId: priced.fx?.fxRateId ?? null,
          fxRateNano: priced.fx?.rateE9 ?? null,
          baseTotalMinor: priced.baseTotalMinor,
          pricingRegionId: priced.pricingRegionId,
          makerBudgetMinor: priced.makerBudgetMinor,
          subtotalMinor: priced.subtotalMinor,
          shippingMinor: priced.shippingMinor,
          totalMinor: priced.totalMinor,
          discountMinor: priced.discountMinor,
          taxRateBps: priced.taxRateBps,
          taxMinor: priced.taxMinor,
          platformFeeMinor: priced.platformFeeMinor,
          sellerShareMinor: priced.sellerShareMinor,
          shippingAddressEnc: this.encryption.encrypt(JSON.stringify(input.shippingAddress)),
          shipCountry: input.shippingAddress.country.toUpperCase(),
          // the seller's preference can raise the tier an order needs, never lower it
          requiredTrustTier: Math.max(
            requiredTierForTotal(priced.baseTotalMinor),
            input.minMakerTier ?? 0
          ),
          matchingRound: 0,
        },
        { client: trx }
      )

      if (locked) await coupons.redeem(locked, buyer, order.id, priced.discountMinor, trx)

      await OrderItem.createMany(
        priced.items.map((i) => ({
          orderId: order.id,
          modelFileId: i.modelFileId,
          technology: i.technology,
          printProfileId: i.printProfileId,
          scalePercent: i.scalePercent,
          material: i.material,
          color: i.color,
          quantity: i.quantity,
          estGrams: i.estGrams,
          estPrintMinutes: i.estPrintMinutes,
          unitCostMinor: i.unitCostMinor,
          manufacturerShareMinor: i.manufacturerShareMinor,
          finishingCode: i.finishingCode,
          finishingColour: i.finishingColour,
          finishingName: i.finishingName,
          finishingMinor: i.finishingMinor,
        })),
        { client: trx }
      )

      return order
    })
  }

  decryptShippingAddress(order: Order): ShippingAddress | null {
    if (!order.shippingAddressEnc) return null
    return JSON.parse(this.encryption.decrypt(order.shippingAddressEnc)) as ShippingAddress
  }

  async findForBuyer(orderId: string, buyerId: string): Promise<Order | null> {
    return Order.query()
      .where('id', orderId)
      .where('buyerId', buyerId)
      .preload('items', (q) => q.preload('modelFile'))
      .preload('productionJobs')
      .first()
  }

  async listForBuyer(buyerId: string, params: { page?: number; perPage?: number } = {}) {
    const { page, perPage } = pageParams(params)
    const paginator = await Order.query()
      .where('buyerId', buyerId)
      .preload('items', (q) => q.preload('modelFile'))
      .preload('productionJobs')
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    return { rows: paginator.all(), meta: pageMeta(paginator.total, page, perPage) }
  }

  /**
   * Orders that came through this seller's products. Drafts (never paid) are hidden.
   * Rows carry no buyer or manufacturer identity — callers must use `OrderTransformer.forSeller`.
   */
  async listForSeller(
    sellerUserId: string,
    params: { page?: number; perPage?: number; status?: OrderStatus } = {}
  ) {
    const { page, perPage } = pageParams(params)
    const query = Order.query()
      .where('sellerId', sellerUserId)
      .whereNot('status', 'draft')
      .preload('items')
      .orderBy('id', 'desc')
    if (params.status) query.where('status', params.status)
    const paginator = await query.paginate(page, perPage)
    return { rows: paginator.all(), meta: pageMeta(paginator.total, page, perPage) }
  }

  /** Status history from the audit log — safe for buyers (no actor or manufacturer data). */
  async timeline(orderId: string): Promise<Array<{ status: OrderStatus; at: string }>> {
    const logs = await AuditLog.query()
      .where('subjectType', 'order')
      .where('subjectId', orderId)
      .where('action', 'order.transition')
      .orderBy('id', 'asc')
    return logs.map((l) => ({ status: l.meta.to as OrderStatus, at: l.createdAt.toISO()! }))
  }

  async cancelByBuyer(orderId: string, buyerId: string): Promise<Order> {
    await this.assertBuyer(orderId, buyerId)
    return this.cancelWithRefund(orderId, { actorId: buyerId, by: 'buyer' })
  }

  /**
   * Cancels an order that no maker has accepted yet (`draft`…`unmatched`). Money already in
   * escrow is turned into a refund obligation in the same transaction as the state change;
   * the provider refund runs after commit and is retried by the `SettleRefunds` sweep.
   */
  async cancelWithRefund(
    orderId: string,
    who: {
      actorId: string | null
      by: 'buyer' | 'system' | 'admin'
      /** cancel only while the order is still in this status (checked under the row lock) */
      onlyFrom?: OrderStatus
    }
  ): Promise<Order> {
    const order = await db.transaction(async (trx) => {
      if (who.onlyFrom) {
        const current = await Order.query({ client: trx })
          .where('id', orderId)
          .forUpdate()
          .firstOrFail()
        if (current.status !== who.onlyFrom) {
          throw new InvalidOrderTransitionError(current.status, 'cancelled')
        }
      }
      const cancelled = await this.sm.transition(orderId, 'cancelled', {
        trx,
        actorId: who.actorId,
        meta: { by: who.by },
      })

      // no maker may accept an offer for a cancelled order
      await MatchOffer.query({ client: trx })
        .where('orderId', orderId)
        .whereIn('status', OPEN_OFFER_STATUSES)
        .update({ status: 'expired' })

      const escrow = await this.ledger.balance('buyer_escrow', {
        orderId,
        currency: cancelled.currency,
        trx,
      })
      if (escrow > 0) {
        await this.payments.recordRefundObligation(orderId, escrow, cancelled.currency, trx)
      }
      return cancelled
    })

    await this.notifier.cancelled(orderId)
    await this.payments.settleRefunds(orderId).catch((error) => {
      logger.error({ msg: 'refund after cancel deferred to sweep', orderId, error: error.message })
    })
    return order
  }

  /** Sweep (idempotent): `unmatched` orders older than the configured window are cancelled + refunded. */
  async autoCancelUnmatched(now: DateTime = DateTime.now()): Promise<number> {
    const cutoff = now.minus({ days: fabrmatchConfig.orders.unmatchedAutoCancelDays }).toSQL()!
    const stale = await Order.query()
      .where('status', 'unmatched')
      .where('updatedAt', '<=', cutoff)
      .select('id')
    let cancelled = 0
    for (const { id } of stale) {
      try {
        // an admin may have reopened it since the list was read: only cancel what still waits
        await this.cancelWithRefund(id, { actorId: null, by: 'system', onlyFrom: 'unmatched' })
        cancelled++
      } catch (error) {
        if (!(error instanceof InvalidOrderTransitionError)) throw error
      }
    }
    return cancelled
  }

  /** Dev-only stand-in for the payment provider (Faz 5): draft → awaiting_payment → paid. */
  async simulatePayment(orderId: string, buyerId: string): Promise<void> {
    await this.assertBuyer(orderId, buyerId)
    const sm = new OrderStateMachine()
    await db.transaction(async (trx) => {
      await sm.transition(orderId, 'awaiting_payment', { trx, actorId: buyerId })
      await sm.transition(orderId, 'paid', { trx, actorId: buyerId, meta: { provider: 'dev' } })
    })
  }

  private async assertBuyer(orderId: string, buyerId: string) {
    const order = await Order.find(orderId)
    if (!order || order.buyerId !== buyerId) throw new OrderInputError('Order not found')
  }
}
