import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import NotificationService from '#services/notifications/notification_service'

/**
 * Timed nudges. Each one is keyed by its subject (order id, week) so the hourly sweep can run as
 * often as it likes: `notify` ignores a key it has already seen.
 */
export default class LifecycleService {
  constructor(private notifications = new NotificationService()) {}

  async welcome(userId: number) {
    await this.notifications.notify({
      userId,
      role: 'buyer',
      type: 'welcome',
      context: {},
      eventKey: 'welcome',
    })
  }

  /** Unpaid orders between 24 and 72 hours old get one reminder. */
  async paymentReminders(now: DateTime = DateTime.now()) {
    const rows = await db.rawQuery(
      `select id, code, buyer_id from orders
        where status = 'awaiting_payment'
          and updated_at <= ? and updated_at > ?`,
      [now.minus({ hours: 24 }).toSQL(), now.minus({ hours: 72 }).toSQL()]
    )
    let sent = 0
    for (const o of rows.rows as Array<{ id: number; code: string; buyer_id: number }>) {
      const made = await this.notifications.notify({
        userId: o.buyer_id,
        role: 'buyer',
        type: 'payment_reminder',
        context: { code: o.code, orderId: o.id },
        eventKey: `payment_reminder:${o.id}`,
      })
      if (made) sent++
    }
    return sent
  }

  /** Three days after delivery, ask for the review if the buyer has neither reviewed nor disputed. */
  async reviewRequests(now: DateTime = DateTime.now()) {
    const rows = await db.rawQuery(
      `select o.id, o.code, o.buyer_id from orders o
        where o.status in ('delivered', 'completed')
          and o.delivered_at <= ? and o.delivered_at > ?
          and not exists (select 1 from production_jobs pj where pj.order_id = o.id and pj.rating is not null)
          and not exists (select 1 from disputes d where d.order_id = o.id)`,
      [now.minus({ days: 3 }).toSQL(), now.minus({ days: 14 }).toSQL()]
    )
    let sent = 0
    for (const o of rows.rows as Array<{ id: number; code: string; buyer_id: number }>) {
      const made = await this.notifications.notify({
        userId: o.buyer_id,
        role: 'buyer',
        type: 'review_request',
        context: { code: o.code, orderId: o.id },
        eventKey: `review_request:${o.id}`,
      })
      if (made) sent++
    }
    return sent
  }

  /** Once a week: approved makers with active printers but no free capacity in the next 7 days. */
  async idleCapacity(now: DateTime = DateTime.now()) {
    const week = `${now.weekYear}-W${now.weekNumber}`
    const rows = await db.rawQuery(
      `select distinct mp.user_id from manufacturer_profiles mp
         join printers p on p.manufacturer_profile_id = mp.id and p.is_active
        where mp.status = 'active'
          and not exists (
            select 1 from capacity_slots cs
             where cs.printer_id = p.id and cs.date >= ? and cs.date <= ?
               and cs.max_minutes - cs.reserved_minutes > 0)`,
      [now.toISODate(), now.plus({ days: 7 }).toISODate()]
    )
    let sent = 0
    for (const r of rows.rows as Array<{ user_id: number }>) {
      const made = await this.notifications.notify({
        userId: r.user_id,
        role: 'maker',
        type: 'capacity_idle',
        context: {},
        eventKey: `capacity_idle:${week}`,
      })
      if (made) sent++
    }
    return sent
  }

  async sweep(now: DateTime = DateTime.now()) {
    return {
      paymentReminders: await this.paymentReminders(now),
      reviewRequests: await this.reviewRequests(now),
      idleCapacity: await this.idleCapacity(now),
    }
  }
}
