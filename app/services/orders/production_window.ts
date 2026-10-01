import fabrmatchConfig from '#config/fabrmatch'
import FinishingOption from '#models/finishing_option'
import db from '@adonisjs/lucid/services/db'

/**
 * Days a maker has for an order: the production SLA plus the longest extra time of any finishing
 * on it (sanding, painting…). Used for the capacity window when matching and for the job's due date.
 */
export async function productionDaysFor(items: Array<{ finishingCode: string | null }>) {
  const codes = [...new Set(items.map((i) => i.finishingCode).filter((c): c is string => !!c))]
  if (codes.length === 0) return fabrmatchConfig.orders.productionSlaDays
  const options = await FinishingOption.query().whereIn('code', codes).select('extraDays')
  const extra = Math.max(0, ...options.map((o) => o.extraDays))
  return fabrmatchConfig.orders.productionSlaDays + extra
}

/**
 * Days a maker has for this order. An RFQ order was awarded to a bid with its own delivery time
 * (review fix): that is the window, not the platform default the buyer never agreed to.
 */
export async function productionDaysForOrder(order: {
  id: string
  channel: string
  items: Array<{ finishingCode: string | null }>
}) {
  if (order.channel === 'rfq') {
    const awarded = await db
      .from('rfqs')
      .join('rfq_bids', 'rfq_bids.id', 'rfqs.awarded_bid_id')
      .where('rfqs.order_id', order.id)
      .select('rfq_bids.lead_days as leadDays')
      .first()
    if (awarded?.leadDays) return Number(awarded.leadDays)
  }
  return productionDaysFor(order.items)
}
