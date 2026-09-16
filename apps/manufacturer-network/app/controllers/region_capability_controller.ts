import Manufacturer from '#models/manufacturer'
import ProductionRequest from '#models/production_request'
import type { HttpContext } from '@adonisjs/core/http'

const TURNAROUND_SAMPLE = 200

export default class RegionCapabilityController {
  /** GET /api/v1/region-capability?region=TR-Mersin — Akış 3 */
  async show({ request, response }: HttpContext) {
    const region = String(request.input('region', '')).trim()
    const separator = region.indexOf('-')
    const country = (separator === -1 ? region : region.slice(0, separator)).toUpperCase()
    const city = separator === -1 ? null : region.slice(separator + 1)

    if (!/^[A-Z]{2}$/.test(country)) {
      return response.unprocessableEntity({
        errors: [{ field: 'region', message: 'region must look like TR or TR-Mersin' }],
      })
    }

    const manufacturersQuery = Manufacturer.query().where('status', 'active').where('country_code', country)
    if (city) {
      manufacturersQuery.whereILike('city', city)
    }
    const manufacturers = await manufacturersQuery

    const deliveredQuery = ProductionRequest.query()
      .where('status', 'delivered')
      .where('buyer_country', country)
      .whereNotNull('accepted_at')
      .whereNotNull('delivered_at')
      .orderBy('delivered_at', 'desc')
      .limit(TURNAROUND_SAMPLE)
    if (city) {
      deliveredQuery.whereILike('buyer_city', city)
    }
    const delivered = await deliveredQuery
    const turnaroundDays = delivered.map((r) => r.deliveredAt!.diff(r.acceptedAt!, 'days').days)

    return {
      region,
      supported_materials: [...new Set(manufacturers.flatMap((m) => m.materials))].sort(),
      avg_turnaround_days: turnaroundDays.length
        ? Math.round((turnaroundDays.reduce((sum, days) => sum + days, 0) / turnaroundDays.length) * 10) / 10
        : null,
      manufacturer_count: manufacturers.length,
    }
  }
}
