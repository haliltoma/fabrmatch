import ExperimentService from '#services/growth/experiment_service'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { parseMoneyToMinor } from '#services/pricing/money_input'
import { estimateMakerIncome } from '#services/pricing/maker_income'
import {
  QUICK_QUOTE_MATERIALS,
  QuickQuoteError,
  quickQuoteFromFile,
} from '#services/pricing/quick_quote'
import GrowthService from '#services/growth/growth_service'
import type { Attribution } from '#services/growth/attribution'

const validator = vine.create({
  printers: vine.number().withoutDecimals().min(1).max(50).optional(),
  hours: vine.number().min(1).max(24).optional(),
  busy: vine.number().min(1).max(100).optional(),
  price: vine.string().trim().maxLength(12).optional(),
})

const DEFAULTS = { printers: 2, hours: 10, busy: 40, price: '0.50' }

const MAX_QUICK_BYTES = 15 * 1024 * 1024

export default class ToolController {
  async quickQuotePage({ inertia, session }: HttpContext) {
    await new GrowthService().track(
      'landing_view',
      (session.get('attribution') as Attribution | undefined) ?? null,
      '/tools/quick-quote'
    )
    return inertia.render('tools/quick_quote', { materials: QUICK_QUOTE_MATERIALS })
  }

  async quickQuote({ request, response, session }: HttpContext) {
    const file = request.file('model', { size: MAX_QUICK_BYTES })
    // text formats have no magic bytes, so the format comes from the name; the scan checks the content
    const format = /\.(stl|3mf|obj)$/i.exec(file?.clientName ?? '')?.[1]?.toUpperCase() as
      'STL' | '3MF' | 'OBJ' | undefined
    if (!file || !file.tmpPath || !format) {
      return response.badRequest({ error: 'Choose an STL, 3MF or OBJ file' })
    }
    if (!file.isValid)
      return response.badRequest({ error: file.errors[0]?.message ?? 'Invalid file' })
    try {
      const quote = await quickQuoteFromFile({
        tmpPath: file.tmpPath,
        material: String(request.input('material', 'PLA')),
        format,
      })
      await new ExperimentService().convert('home_cta', session.sessionId)
      return response.json({ quote })
    } catch (error) {
      if (error instanceof QuickQuoteError)
        return response.unprocessableEntity({ error: error.message, blocked: error.blocked })
      throw error
    }
  }

  async makerIncome({ inertia, request, session }: HttpContext) {
    const q = await request.validateUsing(validator)
    const inputs = {
      printers: q.printers ?? DEFAULTS.printers,
      hours: q.hours ?? DEFAULTS.hours,
      busy: q.busy ?? DEFAULTS.busy,
      price: q.price ?? DEFAULTS.price,
    }
    const pricePerGramMinor = parseMoneyToMinor(inputs.price)
    await new GrowthService().track(
      'landing_view',
      (session.get('attribution') as Attribution | undefined) ?? null,
      '/tools/maker-income'
    )
    return inertia.render('tools/maker_income', {
      inputs,
      priceError: pricePerGramMinor === null ? 'Enter a price like 0.50' : null,
      estimate:
        pricePerGramMinor === null
          ? null
          : estimateMakerIncome({
              printers: inputs.printers,
              hoursPerDay: inputs.hours,
              busyPercent: inputs.busy,
              pricePerGramMinor,
            }),
    })
  }
}
