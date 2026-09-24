import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export interface SellerAnalytics {
  days: number
  ordersPlaced: number
  ordersCompleted: number
  /** one figure per currency: an order in USD is never added to one in TRY */
  earned: Amount[]
  pending: Amount[]
  products: Array<{ title: string; units: number; earned: Amount[] }>
}

export interface Amount {
  currency: string
  minor: number
}

/** Sales and earnings for one seller; products are matched through the model file of each order line. */
export default class SellerAnalyticsService {
  async forSeller(
    userId: number,
    days = 30,
    now: DateTime = DateTime.now()
  ): Promise<SellerAnalytics> {
    const since = now.minus({ days }).toSQL()!

    const totals = await db.rawQuery(
      `select currency,
              count(*) as placed,
              count(*) filter (where status in ('completed', 'resolved')) as completed,
              coalesce(sum(seller_share_minor) filter (where status in ('completed', 'resolved')), 0) as earned,
              coalesce(sum(seller_share_minor) filter (where status in ('paid','matching','unmatched','in_production','shipped','delivered','disputed')), 0) as pending
         from orders
        where seller_id = ? and channel = 'storefront' and status <> 'draft' and status <> 'awaiting_payment'
          and status <> 'cancelled' and created_at >= ?
        group by currency
        order by currency`,
      [userId, since]
    )
    const byCurrency = totals.rows as Array<{
      currency: string
      placed: string
      completed: string
      earned: string
      pending: string
    }>

    const perProduct = await db.rawQuery(
      `select sp.title, o.currency, sum(oi.quantity) as units,
              coalesce(sum(o.seller_share_minor) filter (where o.status in ('completed','resolved')), 0) as earned
         from orders o
         join order_items oi on oi.order_id = o.id
         join catalog_products cp on cp.model_file_id = oi.model_file_id
         join seller_products sp on sp.catalog_product_id = cp.id
         join seller_profiles spf on spf.id = sp.seller_profile_id and spf.user_id = o.seller_id
        where o.seller_id = ? and o.channel = 'storefront'
          and o.status not in ('draft', 'awaiting_payment', 'cancelled') and o.created_at >= ?
        group by sp.id, sp.title, o.currency`,
      [userId, since]
    )
    const products = new Map<string, { title: string; units: number; earned: Amount[] }>()
    for (const r of perProduct.rows as Array<{
      title: string
      currency: string
      units: string
      earned: string
    }>) {
      const row = products.get(r.title) ?? { title: r.title, units: 0, earned: [] }
      row.units += Number(r.units)
      if (Number(r.earned) > 0) row.earned.push({ currency: r.currency, minor: Number(r.earned) })
      products.set(r.title, row)
    }
    const ranked = [...products.values()]
      .sort((a, b) => b.units - a.units || a.title.localeCompare(b.title))
      .slice(0, 10)
    const amounts = (pick: 'earned' | 'pending') =>
      byCurrency
        .filter((r) => Number(r[pick]) > 0)
        .map((r) => ({ currency: r.currency, minor: Number(r[pick]) }))

    return {
      days,
      ordersPlaced: byCurrency.reduce((a, r) => a + Number(r.placed), 0),
      ordersCompleted: byCurrency.reduce((a, r) => a + Number(r.completed), 0),
      earned: amounts('earned'),
      pending: amounts('pending'),
      products: ranked,
    }
  }
}
