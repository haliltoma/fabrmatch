import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import Color from '#models/color'
import ExternalOrder from '#models/external_order'
import ModelFile from '#models/model_file'
import Order, { OWN_CHANNELS } from '#models/order'
import SellerProduct from '#models/seller_product'
import type User from '#models/user'
import { marketsFor } from '#services/pricing/maker_market'
import ShippingService from '#services/shipping/shipping_service'
import { unitPriceFor } from '#services/storefront/storefront_service'
import { colourCode, fabrmatchSku } from '#services/integrations/stores/store_adapter'
import StoreService from '#services/integrations/stores/store_service'
import type { ShippingAddress } from '#services/orders/order_service'

/** A request the API refuses; `field` points at what to fix (e.g. `lines.1.material`). */
export class ApiInputError extends DomainError {
  constructor(
    message: string,
    readonly field: string | null = null,
    status = 422
  ) {
    super(message, { status })
  }
}

export interface ApiOrderLine {
  productId: string
  material: string
  color?: string | null
  scalePercent?: number
  quantity: number
}

export const MAX_API_LINES = 50

interface ResolvedLine {
  product: SellerProduct
  material: string
  color: string | null
  scalePercent: number
  quantity: number
  sku: string
}

/**
 * W4: the seller's own website as a sales channel. It reads products, asks what lines cost and
 * places orders; we print, ship and report back through webhooks. Orders go through the same
 * import as shop orders (one hidden `api` connection per seller), so an `externalId` is placed
 * only once, the address is stored encrypted and the balance pays when there is enough.
 */
export default class ApiOrderService {
  /** Checks every line against the seller's own products; the first problem is reported. */
  async resolveLines(seller: User, lines: ApiOrderLine[]): Promise<ResolvedLine[]> {
    if (lines.length === 0) throw new ApiInputError('Add at least one line', 'lines')
    if (lines.length > MAX_API_LINES) {
      throw new ApiInputError(`At most ${MAX_API_LINES} lines per order`, 'lines')
    }
    const colours = await Color.query().where('isActive', true)
    const resolved: ResolvedLine[] = []
    for (const [i, line] of lines.entries()) {
      const at = (field: string) => `lines.${i}.${field}`
      const product = await SellerProduct.query()
        .where('id', line.productId)
        .whereHas('sellerProfile', (q) => q.where('userId', seller.id))
        .whereNot('status', 'archived')
        .preload('catalogProduct')
        .first()
      const catalog = product?.catalogProduct
      if (!product || !catalog || !catalog.isActive || !catalog.modelFileId) {
        throw new ApiInputError('Product not found', at('productId'), 404)
      }
      const material = line.material.trim().toUpperCase()
      if (!catalog.allowedMaterials.map((m) => m.toUpperCase()).includes(material)) {
        throw new ApiInputError(
          `Material ${material} is not offered for this product`,
          at('material')
        )
      }
      const scalePercent = line.scalePercent ?? 100
      if (!(catalog.allowedScales ?? [100]).includes(scalePercent)) {
        throw new ApiInputError(
          `Size ${scalePercent}% is not offered for this product`,
          at('scalePercent')
        )
      }
      let color: string | null = null
      if (line.color) {
        const match = colours.find((c) => c.name.toLowerCase() === line.color!.trim().toLowerCase())
        if (!match) throw new ApiInputError(`Unknown colour: ${line.color}`, at('color'))
        // the SKU names a colour by its code; it must point at this colour only
        if (colours.filter((c) => colourCode(c.name) === colourCode(match.name)).length > 1) {
          throw new ApiInputError(
            `${match.name} cannot be ordered through the API yet`,
            at('color')
          )
        }
        color = match.name
      }
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) {
        throw new ApiInputError('Quantity must be 1 to 100', at('quantity'))
      }
      resolved.push({
        product,
        material,
        color,
        scalePercent,
        quantity: line.quantity,
        sku: fabrmatchSku(product.id, material, color, scalePercent),
      })
    }
    return resolved
  }

  /**
   * What the lines would cost the seller, delivered in Türkiye, at today's makers' market. An
   * estimate: the order itself is priced with the full address (another city can add a little).
   */
  async quote(seller: User, lines: ApiOrderLine[]) {
    const resolved = await this.resolveLines(seller, lines)
    const shipping = await new ShippingService().table()
    const markets = await marketsFor(
      'TR',
      resolved.map((l) => l.material)
    )
    const files = await ModelFile.query().whereIn(
      'id',
      resolved.map((l) => l.product.catalogProduct.modelFileId!)
    )
    const fileOf = new Map(files.map((f) => [f.id, f]))
    const out = []
    let totalMinor = 0
    for (const line of resolved) {
      const atCost = Object.create(line.product, { marginBps: { value: 0 } }) as SellerProduct
      const file = fileOf.get(line.product.catalogProduct.modelFileId!)
      const unit = file
        ? unitPriceFor(
            atCost,
            file,
            line.material,
            shipping,
            line.scalePercent,
            0,
            undefined,
            markets
          )
        : null
      if (unit === null) {
        throw new ApiInputError('This product cannot be priced right now', 'lines')
      }
      totalMinor += unit * line.quantity
      out.push({
        productId: line.product.id,
        material: line.material,
        color: line.color,
        scalePercent: line.scalePercent,
        quantity: line.quantity,
        unitCostMinor: unit,
        lineCostMinor: unit * line.quantity,
      })
    }
    return { currency: 'TRY', estimate: true, lines: out, totalMinor }
  }

  /**
   * Places the order once per `externalId`: a repeat returns the order made the first time
   * (`created: false`). A refused order leaves nothing behind, so the same id can be sent again.
   */
  async create(
    seller: User,
    input: { externalId: string; lines: ApiOrderLine[]; shippingAddress: ShippingAddress },
    /** the key that placed it, for the audit trail (a leaked key's orders can be traced) */
    apiKeyId: string | null = null
  ): Promise<{ order: Order; created: boolean }> {
    const stores = new StoreService()
    const connection = await stores.apiConnection(seller)
    const existing = await this.existing(connection.id, input.externalId)
    if (existing) return { order: existing, created: false }

    const resolved = await this.resolveLines(seller, input.lines)
    const result = await stores.importOrder(connection, {
      externalOrderId: input.externalId,
      name: input.externalId,
      lines: resolved.map((l, i) => ({
        variantId: `line-${i + 1}`,
        sku: l.sku,
        title: l.product.title,
        quantity: l.quantity,
      })),
      shippingAddress: input.shippingAddress,
    })
    if (result.duplicate) {
      // a parallel request with the same id won the race
      const order = await this.existing(connection.id, input.externalId)
      if (order) return { order, created: false }
      throw new ApiInputError('This order is being placed; try again in a moment', null, 409)
    }
    const external = result.externalOrder
    if (external.status !== 'placed' || !external.orderId) {
      const reason = external.error ?? 'The order could not be placed'
      await external.delete()
      throw new ApiInputError(reason, null)
    }
    await AuditLog.create({
      actorId: seller.id,
      action: 'api.order_created',
      subjectType: 'order',
      subjectId: external.orderId,
      meta: { apiKeyId, externalId: input.externalId, lines: resolved.length },
    })
    return { order: await this.load(external.orderId), created: true }
  }

  /** One of the seller's orders by our id: a sale, or an order from their own shop or site. */
  async find(seller: User, orderId: string) {
    return Order.query()
      .where('id', orderId)
      .where((q) => {
        // a sale shows once its buyer paid; the seller's own orders also while unpaid
        q.where((sale) => sale.where('sellerId', seller.id).whereNot('status', 'draft')).orWhere(
          (own) => own.where('buyerId', seller.id).whereIn('channel', [...OWN_CHANNELS])
        )
      })
      .preload('items')
      .first()
  }

  private async existing(connectionId: string, externalId: string) {
    const external = await ExternalOrder.query()
      .where('storeConnectionId', connectionId)
      .where('externalOrderId', externalId)
      .first()
    return external?.orderId ? this.load(external.orderId) : null
  }

  private load(orderId: string) {
    return Order.query().where('id', orderId).preload('items').firstOrFail()
  }
}
