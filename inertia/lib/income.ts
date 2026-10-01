import { makerCost, type CostProfile } from './maker_cost.js'

/**
 * Browser twin of app/services/pricing/maker_income.ts: the same maker_cost formula, the reference
 * maker comes from the server (admin settings). tests/unit/home_income.spec.ts keeps them in step.
 */
export type IncomeRules = {
  gramsPerHour: number
  profile: Omit<CostProfile, 'materialCostPerKgMinor'>
}

export function monthlyIncomeMinor(
  input: { printers: number; hoursPerDay: number; busyPercent: number; pricePerGramMinor: number },
  rules: IncomeRules
) {
  const busy = Math.min(Math.max(input.busyPercent, 1), 100) / 100
  const printHours = input.printers * input.hoursPerDay * 30 * busy
  const perHour = makerCost(
    { ...rules.profile, materialCostPerKgMinor: input.pricePerGramMinor * 1000 },
    { grams: rules.gramsPerHour, minutes: 60 }
  ).floorMinor
  return { monthlyMinor: Math.round(perHour * printHours), printHours }
}
