import db from '@adonisjs/lucid/services/db'

export interface ManufacturerStats {
  completed: number
  avgRating: number | null
  active: number
  shipped: number
  onTime: number
  disputed: number
  total: number
}

/** Track record per maker; feeds matching ranking and the trust-tier calculation. */
export default class MakerStatsService {
  async load(profileIds: string[]): Promise<Map<string, ManufacturerStats>> {
    if (profileIds.length === 0) return new Map()
    const rows = await db
      .from('production_jobs as pj')
      .join('orders as o', 'o.id', 'pj.order_id')
      .whereIn('pj.manufacturer_profile_id', profileIds)
      .groupBy('pj.manufacturer_profile_id')
      .select('pj.manufacturer_profile_id')
      .select(db.raw(`count(*) filter (where pj.status = 'delivered') as completed`))
      .select(db.raw(`avg(pj.rating) as avg_rating`))
      .select(
        db.raw(
          `count(*) filter (where pj.status in ('accepted', 'printing', 'produced')) as active`
        )
      )
      .select(db.raw(`count(*) filter (where pj.shipped_at is not null) as shipped`))
      .select(
        db.raw(
          `count(*) filter (where pj.shipped_at is not null and pj.shipped_at <= pj.due_at) as on_time`
        )
      )
      .select(
        db.raw(
          `count(*) filter (where o.status in ('disputed', 'resolved') or pj.cancel_reason = 'dispute_reprint') as disputed`
        )
      )
      .select(
        db.raw(
          `count(*) filter (where pj.status <> 'cancelled' or pj.cancel_reason = 'dispute_reprint') as total`
        )
      )

    const map = new Map<string, ManufacturerStats>()
    for (const r of rows) {
      map.set(String(r.manufacturer_profile_id), {
        completed: Number(r.completed),
        avgRating: r.avg_rating === null ? null : Number(r.avg_rating),
        active: Number(r.active),
        shipped: Number(r.shipped),
        onTime: Number(r.on_time),
        disputed: Number(r.disputed),
        total: Number(r.total),
      })
    }
    return map
  }
}
