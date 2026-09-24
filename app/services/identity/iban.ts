/** Country → IBAN length, for the countries makers are expected to be in. Others are rejected. */
const LENGTHS: Record<string, number> = {
  TR: 26,
  DE: 22,
  FR: 27,
  GB: 22,
  NL: 18,
  IT: 27,
  ES: 24,
  AT: 20,
  BE: 16,
  CH: 21,
  IE: 22,
  PT: 25,
  PL: 28,
  SE: 24,
  DK: 18,
  NO: 15,
  FI: 18,
  CZ: 24,
  GR: 27,
  RO: 24,
  BG: 22,
  HU: 28,
  CY: 28,
  LU: 20,
  MT: 31,
}

export const normalizeIban = (raw: string) => raw.replaceAll(/\s+/g, '').toUpperCase()

/** ISO 13616: right length for the country, and the mod-97 check on the rearranged digits equals 1. */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false
  if (LENGTHS[iban.slice(0, 2)] !== iban.length) return false
  const digits = (iban.slice(4) + iban.slice(0, 4)).replaceAll(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55)
  )
  let remainder = 0
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97
  return remainder === 1
}

/** "TR33 **** **** **** **** **26": enough to recognise the account, not enough to use it. */
export function maskIban(raw: string): string {
  const iban = normalizeIban(raw)
  const head = iban.slice(0, 4)
  const tail = iban.slice(-2)
  const middle = '*'.repeat(Math.max(0, iban.length - 6))
  return `${head}${middle}${tail}`.replaceAll(/(.{4})/g, '$1 ').trim()
}
