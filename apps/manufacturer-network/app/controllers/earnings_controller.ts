import PayoutInstruction from '#models/payout_instruction'
import { findManufacturerForUser } from '#services/panel/serializers'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class EarningsController {
  async index({ auth, inertia, response }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    const instructions = await PayoutInstruction.query()
      .where('manufacturer_id', manufacturer.id)
      .preload('productionRequest', (q) => q.select('id', 'public_id', 'design_reference', 'delivered_at'))
      .orderBy('created_at', 'desc')
      .limit(200)

    const nowMonth = DateTime.now().startOf('month')
    let totalPending = 0
    let totalSent = 0
    let thisMonth = 0

    for (const inst of instructions) {
      if (inst.status === 'pending') totalPending += inst.amount
      if (inst.status === 'sent') totalSent += inst.amount
      const createdAt = DateTime.fromJSDate(inst.createdAt as unknown as Date)
      if (createdAt >= nowMonth) thisMonth += inst.amount
    }

    return inertia.render('panel/earnings', {
      instructions: instructions.map((inst) => ({
        id: inst.id,
        publicId: inst.publicId,
        amount: inst.amount,
        currencyCode: inst.currencyCode,
        status: inst.status,
        createdAt: (inst.createdAt as unknown as Date).toISOString(),
        designReference: inst.productionRequest.designReference,
        productionRequestPublicId: inst.productionRequest.publicId,
      })),
      summary: {
        totalPending,
        totalSent,
        thisMonth,
        currencyCode: manufacturer.currencyCode,
      },
    })
  }
}
