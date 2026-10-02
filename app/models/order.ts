import { OrderSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OrderItem from '#models/order_item'
import ProductionJob from '#models/production_job'
import MatchOffer from '#models/match_offer'
import Payment from '#models/payment'
import Dispute from '#models/dispute'

export type OrderStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'paid'
  | 'matching'
  | 'unmatched'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'resolved'
  | 'cancelled'

export type OrderChannel =
  'storefront' | 'shopify' | 'etsy' | 'woocommerce' | 'wix' | 'api' | 'rfq' | 'direct' | 'sample'

/** Orders from the seller's own shops and website: the seller is the buyer, `sellerId` is empty. */
export const OWN_CHANNELS: readonly OrderChannel[] = [
  'shopify',
  'etsy',
  'woocommerce',
  'wix',
  'api',
]

/** The seller an order belongs to: who earns its margin, or who ordered it from their own shop. */
export function sellerOf(order: { sellerId: string | null; buyerId: string; channel: string }) {
  return (
    order.sellerId ?? (OWN_CHANNELS.includes(order.channel as OrderChannel) ? order.buyerId : null)
  )
}

export default class Order extends OrderSchema {
  declare status: OrderStatus
  declare channel: OrderChannel

  @belongsTo(() => User, { foreignKey: 'buyerId' })
  declare buyer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'sellerId' })
  declare seller: BelongsTo<typeof User>

  @hasMany(() => OrderItem)
  declare items: HasMany<typeof OrderItem>

  @hasMany(() => ProductionJob)
  declare productionJobs: HasMany<typeof ProductionJob>

  @hasMany(() => MatchOffer)
  declare matchOffers: HasMany<typeof MatchOffer>

  @hasMany(() => Payment)
  declare payments: HasMany<typeof Payment>

  @hasMany(() => Dispute)
  declare disputes: HasMany<typeof Dispute>
}
