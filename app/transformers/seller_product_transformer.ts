import type SellerProduct from '#models/seller_product'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class SellerProductTransformer extends BaseTransformer<SellerProduct> {
  toObject() {
    return {
      id: this.resource.id,
      title: this.resource.title,
      status: this.resource.status,
      currency: this.resource.currency,
      marginBps: this.resource.marginBps,
      createdAt: this.resource.createdAt.toISO(),
    }
  }
}
