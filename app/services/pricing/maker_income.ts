import {
  DEFAULT_HOURLY_RATE_MINOR,
  DEFAULT_MANUFACTURER_PROFIT_BPS,
  GRAMS_PER_PRINT_HOUR,
} from '#services/pricing/price_engine'

export interface MakerIncomeInput {
  printers: number
  /** hours per day the printers could run for platform orders */
  hoursPerDay: number
  /** share of those hours that actually get an order, 1–100 */
  busyPercent: number
  pricePerGramMinor: number
}

export interface MakerIncomeEstimate {
  printHoursPerMonth: number
  gramsPerMonth: number
  perPrintHourMinor: number
  materialMinor: number
  machineMinor: number
  profitMinor: number
  monthlyMinor: number
}

const DAYS_PER_MONTH = 30

/**
 * What a maker's share adds up to under the same rules the price engine uses: material at their
 * own price per gram, machine time at the default hourly rate, plus the default maker margin.
 * It is an illustration of the formula — the number of orders is the busy-percentage the visitor
 * chooses, never a promise.
 */
export function estimateMakerIncome(input: MakerIncomeInput): MakerIncomeEstimate {
  const busy = Math.min(Math.max(input.busyPercent, 1), 100) / 100
  const printHours = input.printers * input.hoursPerDay * DAYS_PER_MONTH * busy

  const materialPerHour = Math.ceil(GRAMS_PER_PRINT_HOUR * input.pricePerGramMinor)
  const machinePerHour = DEFAULT_HOURLY_RATE_MINOR
  const shareBeforeProfit = materialPerHour + machinePerHour
  const perHour = Math.ceil(shareBeforeProfit * (1 + DEFAULT_MANUFACTURER_PROFIT_BPS / 10_000))

  return {
    printHoursPerMonth: Math.round(printHours * 10) / 10,
    gramsPerMonth: Math.round(printHours * GRAMS_PER_PRINT_HOUR),
    perPrintHourMinor: perHour,
    materialMinor: Math.round(materialPerHour * printHours),
    machineMinor: Math.round(machinePerHour * printHours),
    profitMinor: Math.round((perHour - shareBeforeProfit) * printHours),
    monthlyMinor: Math.round(perHour * printHours),
  }
}
