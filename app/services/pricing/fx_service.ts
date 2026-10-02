import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import env from '#start/env'
import { featureEnabled, type FeatureName } from '#services/settings/feature_flags'
import {
  BASE_CURRENCY,
  FOREIGN_CURRENCIES,
  isForeignCurrency,
  type ForeignCurrency,
} from '#services/pricing/fx'
import { StaticFxProvider, TcmbProvider, type FxProvider } from '#services/pricing/fx_provider'

export class FxError extends DomainError {}

export interface LockedRate {
  fxRateId: string
  /** the mid rate (foreign per 1 TRY, ×1e9): every part of the order is converted at it */
  rateE9: bigint
  /** Paket V (V4): added on top once, with the region's round-up; the difference is `fx_gain` */
  bufferBps: number
}

const FLAG_FOR: Record<ForeignCurrency, FeatureName> = {
  USD: 'currencyUsd',
  EUR: 'currencyEur',
  GBP: 'currencyGbp',
}

/** Real rates in production; fixed ones elsewhere so dev and tests never call out. */
export function fxProvider(): FxProvider {
  const choice = env.get('FX_PROVIDER', env.get('NODE_ENV') === 'production' ? 'tcmb' : 'static')
  return choice === 'tcmb' ? new TcmbProvider() : new StaticFxProvider()
}

export default class FxService {
  /** TRY always; the others only while an admin has switched them on. */
  enabledCurrencies(): string[] {
    return [BASE_CURRENCY, ...FOREIGN_CURRENCIES.filter((c) => featureEnabled(FLAG_FOR[c]))]
  }

  assertEnabled(currency: string): void {
    if (currency === BASE_CURRENCY) return
    if (!isForeignCurrency(currency) || !this.enabledCurrencies().includes(currency)) {
      throw new FxError(`Prices in ${currency} are not available`)
    }
  }

  /**
   * The rate an order will be priced with: the newest stored mid rate and the FX buffer to add on
   * top (the region's own, else the global one), refused when the rate is older than the allowed
   * age (a stale rate could lose real money).
   */
  async lock(currency: string, regionBufferBps: number | null = null): Promise<LockedRate> {
    this.assertEnabled(currency)
    if (!isForeignCurrency(currency)) throw new FxError('No conversion is needed for TRY')
    const row = await db
      .from('fx_rates')
      .where('currency', currency)
      .orderBy('as_of', 'desc')
      .orderBy('id', 'desc')
      .first()
    const maxAge = fabrmatchConfig.pricing.fxMaxAgeHours
    if (
      !row ||
      DateTime.fromJSDate(new Date(row.created_at)) < DateTime.now().minus({ hours: maxAge })
    ) {
      throw new FxError(`Prices in ${currency} are unavailable right now. Please try again later.`)
    }
    return {
      fxRateId: row.id,
      rateE9: BigInt(row.rate_nano),
      bufferBps: regionBufferBps ?? fabrmatchConfig.pricing.fxMarginBps,
    }
  }

  /**
   * Mid rates (foreign per 1 TRY, ×1e9, as strings) for showing browse prices in the visitor's
   * currency. No FX buffer: nothing is charged at these. A rate older than a week is dropped,
   * so a dead feed falls back to TRY instead of showing an outdated conversion.
   */
  async displayRates(): Promise<Record<string, string>> {
    const since = DateTime.now().minus({ days: 7 }).toSQL()
    const rows = await db
      .from('fx_rates')
      .distinctOn('currency')
      .select('currency', 'rate_nano')
      .where('created_at', '>=', since)
      .orderBy('currency')
      .orderBy('as_of', 'desc')
      .orderBy('id', 'desc')
    const rates: Record<string, string> = {}
    for (const row of rows) {
      if (isForeignCurrency(row.currency)) rates[row.currency] = String(row.rate_nano)
    }
    return rates
  }

  async store(snapshot: Awaited<ReturnType<FxProvider['fetch']>>): Promise<number> {
    let stored = 0
    for (const [currency, rate] of Object.entries(snapshot.rates)) {
      if (!isForeignCurrency(currency) || rate <= 0n) continue
      await db
        .table('fx_rates')
        .insert({
          currency,
          rate_nano: rate.toString(),
          source: snapshot.source,
          as_of: snapshot.asOf,
          created_at: DateTime.now().toSQL(),
        })
        .onConflict(['currency', 'as_of'])
        .merge(['rate_nano', 'source', 'created_at'])
      stored += 1
    }
    return stored
  }

  async refresh(provider: FxProvider = fxProvider()): Promise<number> {
    return this.store(await provider.fetch())
  }
}
