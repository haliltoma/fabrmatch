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
  withMargin,
  type ForeignCurrency,
} from '#services/pricing/fx'
import { StaticFxProvider, TcmbProvider, type FxProvider } from '#services/pricing/fx_provider'

export class FxError extends DomainError {}

export interface LockedRate {
  fxRateId: number
  rateE9: bigint
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
   * The rate an order will be priced with: the newest stored rate, widened by the FX buffer, and
   * refused when it is older than the allowed age (a stale rate could lose real money).
   */
  async lock(currency: string): Promise<LockedRate> {
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
      rateE9: withMargin(BigInt(row.rate_nano), fabrmatchConfig.pricing.fxMarginBps),
    }
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
