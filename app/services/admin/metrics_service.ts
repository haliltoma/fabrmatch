import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export interface Metrics {
  days: number
  currency: string
  gmvMinor: number
  commissionMinor: number
  paidOrders: number
  completedOrders: number
  /** median minutes from "matching started" to a maker accepting; null without data */
  medianMatchMinutes: number | null
  offerAcceptRate: number | null
  disputeRate: number | null
  newMakerShare: number | null
  unmatchedRate: number | null
  daily: Array<{ date: string; gmvMinor: number; orders: number }>
}

const PAID_STATUSES = `('paid','matching','unmatched','in_production','shipped','delivered','completed','disputed','resolved')`

/** PRD §15 success measures plus the money numbers, for the last N days (orders of every currency, GMV in TRY equivalent; fees are the TRY ledger only). */
export default class MetricsService {
  async compute(days = 30, now: DateTime = DateTime.now()): Promise<Metrics> {
    const since = now.minus({ days }).startOf('day').toSQL()!

    const orders = await db.rawQuery(
      `select count(*) as paid,
              coalesce(sum(base_total_minor), 0) as gmv,
              count(*) filter (where status in ('completed','resolved')) as completed,
              count(*) filter (where status = 'unmatched') as unmatched
         from orders where status in ${PAID_STATUSES} and created_at >= ?`,
      [since]
    )
    const o = orders.rows[0]
    const paid = Number(o.paid)

    const commission = await db.rawQuery(
      `select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0) as fee
         from ledger_entries where account = 'platform_fee' and currency = 'TRY' and created_at >= ?`,
      [since]
    )

    // time from the first "→ matching" transition to the job being accepted
    const match = await db.rawQuery(
      `select percentile_cont(0.5) within group (order by extract(epoch from (pj.accepted_at - t.at)) / 60) as median
         from production_jobs pj
         join lateral (
           select min(a.created_at) as at from audit_logs a
            where a.subject_type = 'order' and a.subject_id = pj.order_id
              and a.action = 'order.transition' and a.meta->>'to' = 'matching'
         ) t on t.at is not null
        where pj.status <> 'cancelled' and pj.accepted_at >= ?`,
      [since]
    )

    const offers = await db.rawQuery(
      `select count(*) filter (where status = 'accepted') as accepted,
              count(*) filter (where status in ('accepted','declined','expired')) as answered
         from match_offers where created_at >= ?`,
      [since]
    )
    const answered = Number(offers.rows[0].answered)

    const disputes = await db.rawQuery(
      `select count(distinct d.order_id) as n from disputes d
         join orders o on o.id = d.order_id
        where o.created_at >= ? and o.currency = 'TRY'`,
      [since]
    )
    const delivered = await db.rawQuery(
      `select count(*) as n from orders
        where created_at >= ? and currency = 'TRY'
          and status in ('delivered','completed','disputed','resolved')`,
      [since]
    )

    // jobs taken by a maker who had joined within 30 days of accepting it
    const newMakers = await db.rawQuery(
      `select count(*) as total,
              count(*) filter (where mp.created_at > pj.accepted_at - interval '30 days') as fresh
         from production_jobs pj join manufacturer_profiles mp on mp.id = pj.manufacturer_profile_id
        where pj.status <> 'cancelled' and pj.accepted_at >= ?`,
      [since]
    )
    const jobsTotal = Number(newMakers.rows[0].total)

    const daily = await db.rawQuery(
      `select to_char(created_at, 'YYYY-MM-DD') as date, sum(base_total_minor) as gmv, count(*) as n
         from orders where status in ${PAID_STATUSES} and created_at >= ?
        group by 1 order by 1`,
      [since]
    )
    const byDate = new Map<string, { gmv: number; n: number }>(
      daily.rows.map((r: { date: string; gmv: string; n: string }) => [
        r.date,
        { gmv: Number(r.gmv), n: Number(r.n) },
      ])
    )
    const series = []
    for (let i = days; i >= 0; i--) {
      const date = now.minus({ days: i }).toISODate()!
      const hit = byDate.get(date)
      series.push({ date, gmvMinor: hit?.gmv ?? 0, orders: hit?.n ?? 0 })
    }

    const deliveredCount = Number(delivered.rows[0].n)
    return {
      days,
      currency: 'TRY',
      gmvMinor: Number(o.gmv),
      commissionMinor: Number(commission.rows[0].fee),
      paidOrders: paid,
      completedOrders: Number(o.completed),
      medianMatchMinutes:
        match.rows[0].median === null ? null : Math.round(Number(match.rows[0].median)),
      offerAcceptRate: answered > 0 ? Number(offers.rows[0].accepted) / answered : null,
      disputeRate: deliveredCount > 0 ? Number(disputes.rows[0].n) / deliveredCount : null,
      newMakerShare: jobsTotal > 0 ? Number(newMakers.rows[0].fresh) / jobsTotal : null,
      unmatchedRate: paid > 0 ? Number(o.unmatched) / paid : null,
      daily: series,
    }
  }
}
