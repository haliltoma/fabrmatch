/**
 * Money text → integer minor units. Pure string math, no float multiplication, so "0.29" can
 * never become 28.999999. Shared by the UI (`inertia/lib/money.ts`) and unit tests.
 */

const GROUPED = /^[1-9]\d{0,2}([.,]\d{3})+$/

/**
 * Accepts "0,60" "0.6" "12" "1.234,56" "1,234.56" "1.234" (= 1234, thousands grouping).
 * Returns null for anything else (negative, >2 decimals, garbage, overflow).
 */
export function parseMoneyToMinor(input: string): number | null {
  const text = input.trim().replaceAll(/\s+/g, '')
  if (!text || !/^\d[\d.,]*$/.test(text)) return null

  const hasComma = text.includes(',')
  const hasDot = text.includes('.')
  const lastSep = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'))

  let wholeText = text
  let fraction = ''

  if (lastSep !== -1) {
    const tail = text.slice(lastSep + 1)
    const separators = (text.match(/[.,]/g) ?? []).length
    const sameKind = !(hasComma && hasDot)

    if (tail.length >= 1 && tail.length <= 2 && (!sameKind || separators === 1)) {
      // last separator is the decimal mark
      wholeText = text.slice(0, lastSep)
      fraction = tail
    } else if (tail.length === 3 && GROUPED.test(sameKind ? text : text.slice(0, lastSep + 4))) {
      // only thousands grouping, no decimals
      wholeText = text
    } else {
      return null
    }
  }

  // whole part: grouping separators (if any) must sit every three digits
  if (/[.,]/.test(wholeText) && !GROUPED.test(wholeText)) return null
  const digits = wholeText.replaceAll(/[.,]/g, '')
  if (!/^\d+$/.test(digits)) return null

  const minor = Number(digits) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}

/** minor units → "0.60" (input display). */
export function minorToInput(minor: number): string {
  const whole = Math.trunc(minor / 100)
  const frac = String(minor % 100).padStart(2, '0')
  return `${whole}.${frac}`
}
