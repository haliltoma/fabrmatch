import { decimalToMicro, rateFromTryPerUnit, FOREIGN_CURRENCIES } from '#services/pricing/fx'

export interface FxSnapshot {
  /** ISO date the rates are valid for */
  asOf: string
  /** foreign per 1 TRY, ×1e9 */
  rates: Record<string, bigint>
  source: string
}

export interface FxProvider {
  fetch(): Promise<FxSnapshot>
}

/** Fixed rates for development and tests. Never used in production (see `fxProvider()`). */
export class StaticFxProvider implements FxProvider {
  constructor(private tryPerUnit: Record<string, string> = { USD: '40', EUR: '44', GBP: '52' }) {}

  async fetch(): Promise<FxSnapshot> {
    const rates: Record<string, bigint> = {}
    for (const [code, value] of Object.entries(this.tryPerUnit)) {
      rates[code] = rateFromTryPerUnit(decimalToMicro(value))
    }
    return { asOf: new Date().toISOString().slice(0, 10), rates, source: 'static' }
  }
}

/**
 * Parses the Turkish central bank's daily file (`today.xml`). We use ForexSelling: the rate at which
 * a bank sells foreign currency, i.e. the conservative side for a buyer paying in it.
 */
export function parseTcmb(xml: string): FxSnapshot {
  const date = /<Tarih_Date[^>]*\sTarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml)
  if (!date) throw new Error('TCMB file has no date')
  const rates: Record<string, bigint> = {}
  for (const code of FOREIGN_CURRENCIES) {
    const block = new RegExp(`<Currency[^>]*\\sKod="${code}"[^>]*>([\\s\\S]*?)</Currency>`).exec(
      xml
    )
    if (!block) continue
    const unit = /<Unit>(\d+)<\/Unit>/.exec(block[1])
    const selling = /<ForexSelling>([\d.,]+)<\/ForexSelling>/.exec(block[1])
    if (!unit || !selling) continue
    const perUnit = decimalToMicro(selling[1]) / BigInt(unit[1])
    if (perUnit > 0n) rates[code] = rateFromTryPerUnit(perUnit)
  }
  if (Object.keys(rates).length === 0) throw new Error('TCMB file has no usable rates')
  return { asOf: `${date[3]}-${date[2]}-${date[1]}`, rates, source: 'tcmb' }
}

export class TcmbProvider implements FxProvider {
  constructor(private url = 'https://www.tcmb.gov.tr/kurlar/today.xml') {}

  async fetch(): Promise<FxSnapshot> {
    const response = await fetch(this.url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`TCMB answered ${response.status}`)
    return parseTcmb(await response.text())
  }
}
