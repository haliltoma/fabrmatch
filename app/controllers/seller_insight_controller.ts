import { sendStatement, statementMonthValidator } from '#services/reports/statement_response'
import PricingRegionService from '#services/pricing/pricing_region_service'
import { visitorCountry } from '#services/pricing/visitor_country'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import MarginPreviewService from '#services/catalog/margin_preview_service'
import SellerAnalyticsService from '#services/catalog/seller_analytics_service'

const previewValidator = vine.create({
  catalogProductId: vine.number().positive().withoutDecimals(),
  marginBps: vine.number().withoutDecimals().min(0).max(20000),
})
const analyticsValidator = vine.create({
  days: vine.number().withoutDecimals().min(1).max(365).optional(),
})

export default class SellerInsightController {
  async marginPreview({ request, response }: HttpContext) {
    const { catalogProductId, marginBps } = await request.validateUsing(previewValidator)
    // what buyers where the seller browses from would pay (their region's rules, P2)
    const terms = await new PricingRegionService().termsFor(visitorCountry({ request }))
    return response.json({
      options: await new MarginPreviewService().preview(catalogProductId, marginBps, terms),
    })
  }

  async analytics({ inertia, request, auth }: HttpContext) {
    const { days } = await request.validateUsing(analyticsValidator)
    return inertia.render('seller/analytics', {
      analytics: await new SellerAnalyticsService().forSeller(auth.getUserOrFail().id, days ?? 30),
    })
  }

  /** The seller's own payouts for a month as CSV: order codes and amounts only. */
  async statement({ request, response, auth }: HttpContext) {
    const { month } = await request.validateUsing(statementMonthValidator)
    return sendStatement(response, month, {
      type: 'seller',
      beneficiaryId: auth.getUserOrFail().id,
    })
  }
}
