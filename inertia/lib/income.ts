/**
 * Browser twin of app/services/pricing/maker_income.ts (same formula; the constants come from the
 * server). tests/unit/home_income.spec.ts keeps the two in step.
 */
export type IncomeRules = { gramsPerHour: number; hourlyRateMinor: number; profitBps: number }

export function monthlyIncomeMinor(
  input: { printers: number; hoursPerDay: number; busyPercent: number; pricePerGramMinor: number },
  rules: IncomeRules
) {
  const busy = Math.min(Math.max(input.busyPercent, 1), 100) / 100
  const printHours = input.printers * input.hoursPerDay * 30 * busy
  const materialPerHour = Math.ceil(rules.gramsPerHour * input.pricePerGramMinor)
  const perHour = Math.ceil(
    (materialPerHour + rules.hourlyRateMinor) * (1 + rules.profitBps / 10_000)
  )
  return { monthlyMinor: Math.round(perHour * printHours), printHours }
}
