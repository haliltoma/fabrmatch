import { BaseTransformer } from '@adonisjs/core/transformers'
import type PricingRegion from '#models/pricing_region'

/** Admin view of a pricing region, in the units the form uses (percent, TRY). Preload `materials`. */
export default class PricingRegionTransformer extends BaseTransformer<PricingRegion> {
  toObject() {
    const r = this.resource
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      currency: r.currency,
      countries: r.countries,
      isFallback: r.isFallback,
      multiplierPercent: r.referenceMultiplierBps / 100,
      commissionPercent: r.commissionBps === null ? null : r.commissionBps / 100,
      minOrderMinor: r.minOrderMinor,
      rounding: r.rounding,
      currencyMode: r.currencyMode,
      fxBufferPercent: r.fxBufferBps === null ? null : r.fxBufferBps / 100,
      materialPrices: Object.fromEntries(
        (r.materials ?? []).map((m) => [m.material, m.pricePerGramMinor])
      ),
    }
  }
}
