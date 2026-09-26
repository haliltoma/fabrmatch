import FinishingService from '#services/catalog/finishing_service'
import CouponService, { CouponError } from '#services/pricing/coupon_service'
import DomainError from '#exceptions/domain_error'
import CartItem from '#models/cart_item'
import ModelFile from '#models/model_file'
import type Order from '#models/order'
import type User from '#models/user'
import OrderService, { type ShippingAddress } from '#services/orders/order_service'
import EtaService from '#services/orders/eta_service'
import { priceOrder } from '#services/orders/order_pricing'

export class CartError extends DomainError {}

const MAX_LINES = 20
const MAX_QUANTITY = 1000

export interface CartLineInput {
  modelFileId: number
  material: string
  printProfileId?: number | null
  finishing?: string | null
  /** paint colour for a finishing that needs one */
  finishingColour?: string | null
  color?: string | null
  infill?: number | null
  quantity: number
}

/** A member's cart: lines are kept as choices; prices are always recomputed, never stored. */
export default class CartService {
  async add(user: User, input: CartLineInput): Promise<CartItem> {
    const file = await ModelFile.query()
      .where('id', input.modelFileId)
      .where('ownerId', user.id)
      .where('analysisStatus', 'done')
      .first()
    if (!file) throw new CartError('Model file not found or not analysed yet')
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new CartError('Quantity must be at least 1')
    }

    const material = input.material.trim().toUpperCase()
    // a painted part needs a known colour: say so now, not at checkout
    const finishingService = new FinishingService()
    const option = await finishingService.resolve(input.finishing, material)
    input.finishingColour = await finishingService.resolveColour(option, input.finishingColour)
    const query = CartItem.query()
      .where('userId', user.id)
      .where('modelFileId', file.id)
      .where('material', material)
    if (input.printProfileId) query.where('printProfileId', input.printProfileId)
    else query.whereNull('printProfileId')
    if (input.color) query.where('color', input.color)
    else query.whereNull('color')
    const finishing = input.finishing ? input.finishing.trim().toUpperCase() : null
    if (finishing) query.where('finishingCode', finishing)
    else query.whereNull('finishingCode')
    const finishingColour = input.finishingColour?.trim() || null
    if (finishingColour) query.where('finishingColour', finishingColour)
    else query.whereNull('finishingColour')
    const existing = await query.first()

    if (existing) {
      existing.quantity = Math.min(existing.quantity + input.quantity, MAX_QUANTITY)
      await existing.save()
      return existing
    }

    const count = await CartItem.query().where('userId', user.id).count('* as n').first()
    if (Number(count?.$extras.n ?? 0) >= MAX_LINES) {
      throw new CartError(`A cart holds at most ${MAX_LINES} lines`)
    }
    return CartItem.create({
      userId: user.id,
      modelFileId: file.id,
      material,
      printProfileId: input.printProfileId ?? null,
      color: input.color ?? null,
      finishingCode: finishing,
      finishingColour,
      infill: input.infill === null || input.infill === undefined ? null : String(input.infill),
      quantity: Math.min(input.quantity, MAX_QUANTITY),
    })
  }

  async setQuantity(user: User, itemId: number, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new CartError(`Quantity must be between 1 and ${MAX_QUANTITY}`)
    }
    const item = await CartItem.query().where('id', itemId).where('userId', user.id).first()
    if (!item) throw new CartError('Cart line not found')
    item.quantity = quantity
    await item.save()
  }

  async remove(user: User, itemId: number) {
    await CartItem.query().where('id', itemId).where('userId', user.id).delete()
  }

  async count(userId: number): Promise<number> {
    const row = await CartItem.query().where('userId', userId).sum('quantity as n').first()
    return Number(row?.$extras.n ?? 0)
  }

  /** Lines with the price the order would have today; `problem` explains a line that cannot be priced. */
  async preview(user: User, country = 'TR', currency = 'TRY', couponCode?: string) {
    const lines = await CartItem.query()
      .where('userId', user.id)
      .preload('modelFile')
      .orderBy('id', 'asc')
    let priced = null
    let problem: string | null = null
    let couponProblem: string | null = null
    let coupon = null
    if (couponCode) {
      try {
        coupon = await new CouponService().resolve(couponCode, user)
      } catch (error) {
        if (!(error instanceof CouponError)) throw error
        couponProblem = error.message
      }
    }
    if (lines.length > 0) {
      try {
        priced = await priceOrder({
          items: lines.map((l) => this.toPricing(l)),
          country,
          hasSeller: false,
          currency,
          coupon: coupon ?? undefined,
        })
        if (coupon && priced.discountMinor === 0) {
          couponProblem = 'This code does not apply to this order'
        }
      } catch (error) {
        if (!(error instanceof DomainError)) throw error
        problem = error.message
      }
    }
    const eta = priced
      ? await new EtaService().estimate({
          technology: priced.technology,
          printMinutes: priced.estPrintMinutes,
          country,
        })
      : null
    return {
      eta,
      lines: lines.map((l, i) => ({
        id: l.id,
        fileName: l.modelFile.originalName,
        material: l.material,
        printProfileId: l.printProfileId,
        finishing: l.finishingCode,
        finishingColour: l.finishingColour,
        color: l.color,
        quantity: l.quantity,
        unitPriceMinor: priced?.items[i].unitCostMinor ?? null,
      })),
      totals: priced
        ? {
            subtotalMinor: priced.subtotalMinor,
            shippingMinor: priced.shippingMinor,
            totalMinor: priced.totalMinor,
            taxRateBps: priced.taxRateBps,
            taxMinor: priced.taxMinor,
            discountMinor: priced.discountMinor,
            currency: priced.currency,
          }
        : null,
      problem,
      couponProblem,
    }
  }

  /** Turns the cart into one draft order and empties it. */
  async checkout(
    user: User,
    address: ShippingAddress,
    currency = 'TRY',
    couponCode?: string
  ): Promise<Order> {
    const lines = await CartItem.query().where('userId', user.id).orderBy('id', 'asc')
    if (lines.length === 0) throw new CartError('Your cart is empty')
    const order = await new OrderService().createDraftForItems(user, {
      items: lines.map((l) => ({
        modelFileId: l.modelFileId,
        material: l.material,
        printProfileId: l.printProfileId,
        finishing: l.finishingCode,
        finishingColour: l.finishingColour,
        color: l.color,
        infill: l.infill === null ? undefined : Number(l.infill),
        quantity: l.quantity,
      })),
      shippingAddress: address,
      currency,
      couponCode,
    })
    await CartItem.query().where('userId', user.id).delete()
    return order
  }

  private toPricing(line: CartItem) {
    return {
      file: line.modelFile,
      material: line.material,
      printProfileId: line.printProfileId,
      finishing: line.finishingCode,
      finishingColour: line.finishingColour,
      color: line.color,
      infill: line.infill === null ? undefined : Number(line.infill),
      quantity: line.quantity,
    }
  }
}
