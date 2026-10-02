import type { HttpContext } from '@adonisjs/core/http'
import fabrmatchConfig from '#config/fabrmatch'
import PrinterMaterial from '#models/printer_material'
import MakerCostProfileService, {
  profitLimits,
} from '#services/manufacturing/maker_cost_profile_service'
import { makerCostsValidator } from '#validators/maker_costs'

/** Paket V: the maker's own costs and profit, with a live "what I am paid" example. */
export default class MakerCostController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const profileId = user.manufacturerProfile.id
    const service = new MakerCostProfileService()
    const materials = await PrinterMaterial.query()
      .whereHas('printer', (q) => q.where('manufacturerProfileId', profileId))
      .orderBy('material', 'asc')
    // one line per material: the cheapest spool the maker entered for it
    const perMaterial = new Map<string, number>()
    for (const m of materials) {
      const current = perMaterial.get(m.material)
      if (current === undefined || m.materialCostPerKgMinor < current) {
        perMaterial.set(m.material, m.materialCostPerKgMinor)
      }
    }
    return inertia.render('maker/costs', {
      costs: await service.forMaker(profileId),
      defaults: service.defaults(),
      limits: { ...profitLimits(), maxDistanceBps: fabrmatchConfig.makerPay.maxDistanceBps },
      materials: [...perMaterial.entries()].map(([material, costPerKgMinor]) => ({
        material,
        costPerKgMinor,
      })),
    })
  }

  async save({ request, response, session, auth }: HttpContext) {
    const costs = await request.validateUsing(makerCostsValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    await new MakerCostProfileService().save(user.manufacturerProfile.id, costs)
    session.flash('success', 'Your costs are saved.')
    return response.redirect().toPath('/maker/costs')
  }
}
