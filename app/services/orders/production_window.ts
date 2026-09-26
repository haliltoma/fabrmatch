import fabrmatchConfig from '#config/fabrmatch'
import FinishingOption from '#models/finishing_option'

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
