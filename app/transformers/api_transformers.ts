import { BaseTransformer } from '@adonisjs/core/transformers'
import type Order from '#models/order'
import type { ApiProductView } from '#services/integrations/api_catalog_service'

/** A product as the seller's own website reads it (W4): no file, no maker, only what sells. */
export class ApiProductTransformer extends BaseTransformer<ApiProductView> {
  toObject() {
    const { product, images, variants, colours } = this.resource
    const catalog = product.catalogProduct
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      status: product.status,
      shopListed: product.shopListed,
      marginBps: product.marginBps,
      ownDesign: catalog?.ownerUserId !== null && catalog?.ownerUserId !== undefined,
      tags: catalog?.tags ?? [],
      materials: catalog?.allowedMaterials.map((m) => m.toUpperCase()) ?? [],
      /** what one piece costs you delivered in Türkiye (TRY), per material × size */
      variants,
      /** colours you may order it in (`color` on an order line) */
      colours,
      images,
      createdAt: product.createdAt.toISO(),
    }
  }
}

export interface ApiOrderView {
  order: Order
  externalId: string | null
  tracking: { carrier: string | null; number: string } | null
}

/** One of the seller's orders through the API: our id and code, theirs, and the tracking. */
export class ApiOrderTransformer extends BaseTransformer<ApiOrderView> {
  toObject() {
    const { order, externalId, tracking } = this.resource
    return {
      id: order.id,
      code: order.code,
      externalId,
      channel: order.channel,
      status: order.status,
      /** true once paid (from your balance or in the panel); production starts after it */
      paid: !['draft', 'awaiting_payment', 'cancelled'].includes(order.status),
      currency: order.currency,
      totalMinor: order.totalMinor,
      /** your margin on a sale in the Fabrmatch shop (0 on orders from your own shop or site) */
      earnMinor: order.sellerShareMinor,
      items: (order.items ?? []).map((i) => ({
        material: i.material,
        color: i.color,
        scalePercent: i.scalePercent ?? 100,
        quantity: i.quantity,
      })),
      tracking,
      createdAt: order.createdAt.toISO(),
    }
  }
}
