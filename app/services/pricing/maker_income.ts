import { GRAMS_PER_PRINT_HOUR, referenceCostProfile } from '#services/pricing/price_engine'
import { makerCost } from '#services/pricing/maker_cost'

export interface MakerIncomeInput {
  printers: number
  /** hours per day the printers could run for platform orders */
  hoursPerDay: number
  /** share of those hours that actually get an order, 1–100 */
  busyPercent: number
  /** what the maker pays for material, per gram */
  pricePerGramMinor: number
}

export interface MakerIncomeEstimate {
  printHoursPerMonth: number
  gramsPerMonth: number
  perPrintHourMinor: number
  materialMinor: number
  machineMinor: number
  /** the allowance for prints that fail and are printed again */
  allowanceMinor: number
  profitMinor: number
  monthlyMinor: number
}

const DAYS_PER_MONTH = 30

/**
 * What a maker's share adds up to under the same rules the price engine uses (maker_cost.ts with
 * the reference maker of /admin/settings → Maker pay), with material at the visitor's own price.
 * It is an illustration of the formula — the number of orders is the busy-percentage the visitor
 * chooses, never a promise.
 */
export function estimateMakerIncome(input: MakerIncomeInput): MakerIncomeEstimate {
  const busy = Math.min(Math.max(input.busyPercent, 1), 100) / 100
  const printHours = input.printers * input.hoursPerDay * DAYS_PER_MONTH * busy
  // one print hour of a long print: setup is spread thin, so it is left out
  const hour = makerCost(
    { ...referenceCostProfile(input.pricePerGramMinor), setupMinor: 0 },
    { grams: GRAMS_PER_PRINT_HOUR, minutes: 60 }
  )
  const month = (minor: number) => Math.round(minor * printHours)
  return {
    printHoursPerMonth: Math.round(printHours * 10) / 10,
    gramsPerMonth: Math.round(printHours * GRAMS_PER_PRINT_HOUR),
    perPrintHourMinor: hour.floorMinor,
    materialMinor: month(hour.materialMinor),
    machineMinor: month(hour.machineMinor),
    allowanceMinor: month(hour.costMinor - hour.materialMinor - hour.machineMinor),
    profitMinor: month(hour.profitMinor),
    monthlyMinor: month(hour.floorMinor),
  }
}

/** The reference maker as the browser twin (inertia/lib/income.ts) needs it. */
export function incomeRules() {
  const reference = referenceCostProfile(0)
  return {
    gramsPerHour: GRAMS_PER_PRINT_HOUR,
    // material comes from the visitor's own price per gram
    profile: {
      hourlyRateMinor: reference.hourlyRateMinor,
      setupMinor: 0,
      wasteBps: reference.wasteBps,
      failureBps: reference.failureBps,
      profitBps: reference.profitBps,
    },
  }
}
