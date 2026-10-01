import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import { parseMoneyToMinor } from '#services/pricing/money_input'

type Bounds = { min?: number; max?: number }

/**
 * An amount in major units → integer minor units, with no float maths. Text ("12,50",
 * "1.234,56") goes through parseMoneyToMinor; a JSON number is accepted only when it has at most
 * two decimals (12.5 → 1250), so 12.123 is refused instead of being read as 12 123 by the thousands
 * rule. Bounds are in minor units.
 */
const toMinor = vine.createRule((value: unknown, bounds: Bounds, field: FieldContext) => {
  let minor: number | null = null
  if (typeof value === 'string') {
    minor = parseMoneyToMinor(value)
  } else if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    const scaled = value * 100
    const whole = Math.round(scaled)
    // 0.29 * 100 is 28.999999999999996: within a millionth of a whole cent counts as exact
    if (Math.abs(scaled - whole) < 1e-6 && Number.isSafeInteger(whole)) minor = whole
  }
  if (minor === null) {
    field.report('Enter an amount like 12.50', 'money', field)
    return
  }
  if (bounds.min !== undefined && minor < bounds.min) {
    field.report('The amount is too small', 'money.min', field)
    return
  }
  if (bounds.max !== undefined && minor > bounds.max) {
    field.report('The amount is too large', 'money.max', field)
    return
  }
  field.mutate(minor, field)
})

/** Money typed in major units, validated and handed on as integer minor units. */
export const moneyMinor = (bounds: Bounds = {}) =>
  vine
    .any()
    .use(toMinor(bounds))
    .transform((value) => value as number)
