import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import fabrmatchConfig from '#config/fabrmatch'
import PricingRegionTransformer from '#transformers/pricing_region_transformer'
import { PricingRegionAdmin, type RegionChanges } from '#services/pricing/pricing_region_service'
import { REFERENCE_PRICES } from '#services/pricing/reference_prices'
import {
  pricingRegionCreateValidator,
  pricingRegionMaterialValidator,
  pricingRegionUpdateValidator,
} from '#validators/pricing_region'

type FormInput = Awaited<ReturnType<typeof pricingRegionUpdateValidator.validate>>

/** Display units from the form → stored units (bps, minor). Absent fields stay unchanged. */
function toChanges(data: FormInput): RegionChanges {
  return {
    name: data.name,
    currency: data.currency,
    countries: data.countries === undefined ? undefined : data.countries.split(/[\s,]+/),
    referenceMultiplierBps:
      data.multiplierPercent === undefined ? undefined : Math.round(data.multiplierPercent * 100),
    commissionBps:
      data.commissionPercent === undefined
        ? undefined
        : data.commissionPercent === null
          ? null
          : Math.round(data.commissionPercent * 100),
    minOrderMinor: data.minOrder === undefined ? undefined : Math.round(data.minOrder * 100),
    rounding: data.rounding,
  }
}

/** /admin/pricing-regions — region price levels, commission, minimum and rounding (P2-T9). */
export default class AdminPricingRegionController {
  async index({ inertia }: HttpContext) {
    const regions = await new PricingRegionAdmin().list()
    return inertia.render('admin/pricing_regions/index', {
      regions: await PricingRegionTransformer.transform(regions).resolve(
        app.container.createResolver(),
        0
      ),
      materials: Object.entries(REFERENCE_PRICES).map(([code, r]) => ({
        code,
        label: r.label,
        baseMinor: r.pricePerGramMinor,
      })),
      globalCommissionPercent: fabrmatchConfig.pricing.commissionBps / 100,
    })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(pricingRegionCreateValidator)
    await new PricingRegionAdmin().create(
      { ...toChanges(data), code: data.code, name: data.name },
      auth.getUserOrFail().id
    )
    session.flash('success', 'Region added.')
    return response.redirect().toPath('/admin/pricing-regions')
  }

  async update({ params, request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(pricingRegionUpdateValidator)
    await new PricingRegionAdmin().update(params.id, toChanges(data), auth.getUserOrFail().id)
    session.flash('success', 'Saved.')
    return response.redirect().toPath('/admin/pricing-regions')
  }

  async materialPrice({ params, request, response, session, auth }: HttpContext) {
    const { material, price } = await request.validateUsing(pricingRegionMaterialValidator)
    await new PricingRegionAdmin().setMaterialPrice(
      params.id,
      material,
      price === null ? null : Math.round(price * 100),
      auth.getUserOrFail().id
    )
    session.flash('success', 'Saved.')
    return response.redirect().toPath('/admin/pricing-regions')
  }
}
