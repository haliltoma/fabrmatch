import { ExternalListingSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SellerProduct from '#models/seller_product'

/** One variant in the seller's shop and the Fabrmatch product it maps to (R4-T3). */
export default class ExternalListing extends ExternalListingSchema {
  @belongsTo(() => SellerProduct)
  declare sellerProduct: BelongsTo<typeof SellerProduct>
}
