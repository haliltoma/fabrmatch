import db from '@adonisjs/lucid/services/db'
import { maskedText } from '#services/messaging/contact_filter'

export interface ProductReviews {
  count: number
  average: number | null
  recent: Array<{ rating: number; comment: string | null; at: string }>
}

/**
 * Buyer ratings of finished storefront orders for one listing. They are ratings of the print job,
 * shown without any buyer or maker identity (business rule 1). Only completed orders count.
 */
export default class ReviewService {
  async forListing(sellerProductId: number, limit = 5): Promise<ProductReviews> {
    const base = () =>
      db
        .from('production_jobs as pj')
        .join('orders as o', 'o.id', 'pj.order_id')
        .join('order_items as oi', 'oi.order_id', 'o.id')
        .join('catalog_products as cp', 'cp.model_file_id', 'oi.model_file_id')
        .join('seller_products as sp', 'sp.catalog_product_id', 'cp.id')
        .join('seller_profiles as spf', 'spf.id', 'sp.seller_profile_id')
        .where('sp.id', sellerProductId)
        .whereRaw('spf.user_id = o.seller_id')
        .where('o.channel', 'storefront')
        .whereIn('o.status', ['completed', 'resolved'])
        .whereNotNull('pj.rating')
        .where('pj.status', '<>', 'cancelled')

    const summary = await base().countDistinct('pj.id as n').avg('pj.rating as avg').first()
    const count = Number(summary?.n ?? 0)
    if (count === 0) return { count: 0, average: null, recent: [] }

    const rows = await base()
      .select('pj.rating', 'pj.review_comment', 'pj.updated_at')
      .orderBy('pj.updated_at', 'desc')
      .limit(limit)
    return {
      count,
      average: Math.round(Number(summary?.avg ?? 0) * 10) / 10,
      recent: rows.map((r) => ({
        rating: r.rating as number,
        // public: no phone numbers, e-mails or links in a buyer's words
        comment: maskedText((r.review_comment as string | null) || null),
        at: new Date(r.updated_at).toISOString(),
      })),
    }
  }

  /**
   * How many times this listing was bought and paid for (cancelled and unpaid orders excluded).
   * Shown on the product page as social proof once it reaches SOLD_COUNT_MIN.
   */
  async soldCount(sellerProductId: number): Promise<number> {
    const row = await db
      .from('orders as o')
      .join('order_items as oi', 'oi.order_id', 'o.id')
      .join('catalog_products as cp', 'cp.model_file_id', 'oi.model_file_id')
      .join('seller_products as sp', 'sp.catalog_product_id', 'cp.id')
      .join('seller_profiles as spf', 'spf.id', 'sp.seller_profile_id')
      .where('sp.id', sellerProductId)
      .whereRaw('spf.user_id = o.seller_id')
      .where('o.channel', 'storefront')
      .whereNotIn('o.status', ['draft', 'awaiting_payment', 'cancelled'])
      .countDistinct('o.id as n')
      .first()
    return Number(row?.n ?? 0)
  }
}
