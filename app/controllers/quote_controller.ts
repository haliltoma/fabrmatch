import type { HttpContext } from '@adonisjs/core/http'
import ModelFileService from '#services/files/model_file_service'
import { calculatePrice, estimateGrams } from '#services/pricing/price_engine'
import ShippingService from '#services/shipping/shipping_service'
import { bboxOf } from '#services/shipping/shipping_table'
import { REFERENCE_PRICES, referencePriceFor } from '#services/pricing/reference_prices'
import FinishingService from '#services/catalog/finishing_service'
import PrintProfileService from '#services/catalog/print_profile_service'
import { estimatePrintMinutes } from '#services/pricing/price_engine'
import { slicedNumbers } from '#services/orders/order_pricing'
import GrowthService from '#services/growth/growth_service'
import EtaService from '#services/orders/eta_service'
import Material from '#models/material'
import { quoteValidator } from '#validators/quote'
import PricingRegionService, { roundUnitMinor } from '#services/pricing/pricing_region_service'
import { visitorCountry } from '#services/pricing/visitor_country'

export default class QuoteController {
  async show({ inertia, auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const service = new ModelFileService()
    const file = await service.findByIdForOwner(params.id, user.id)

    if (!file || file.analysisStatus !== 'done' || !file.volumeMm3) {
      return inertia.render('files/quote', {
        file: null,
        error: 'File not analyzed yet or not found.',
        newerVersionId: null,
        materials: [],
        profiles: [],
        finishings: [],
        paintColours: [],
      })
    }

    const newer = await service.newerVersionOf(file)
    const profiles = await new PrintProfileService().list({ activeOnly: true })
    const catalogued = await Material.query()
    const technologies = new Map(catalogued.map((m) => [m.code, m.technology]))
    const finishings = await new FinishingService().list({ activeOnly: true })
    return inertia.render('files/quote', {
      newerVersionId: newer?.id ?? null,
      finishings: finishings.map((f) => ({
        code: f.code,
        name: f.name,
        description: f.description,
        priceMinor: f.priceMinor,
        materials: f.materials as string[] | null,
        needsColour: f.needsColour,
      })),
      paintColours: await new FinishingService().paintColours(),
      profiles: profiles.map((p) => ({
        id: p.id,
        name: p.name,
        technology: p.technology,
        postProcess: p.postProcess,
      })),
      file: {
        id: file.id,
        originalName: file.originalName,
        format: file.format,
        volumeMm3: file.volumeMm3,
        bboxXMm: file.bboxXMm,
        bboxYMm: file.bboxYMm,
        bboxZMm: file.bboxZMm,
        triangleCount: file.triangleCount,
        isPrintable: file.isPrintable,
        dfmIssues: file.dfmIssues ?? [],
      },
      error: null,
      materials: Object.entries(REFERENCE_PRICES).map(([key, val]) => ({
        key,
        label: val.label,
        pricePerGramMinor: val.pricePerGramMinor,
        technology: technologies.get(key) ?? null,
      })),
    })
  }

  async calculate({ request, response, auth, params, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(quoteValidator)

    const service = new ModelFileService()
    const file = await service.findByIdForOwner(params.id, user.id)

    if (!file || !file.volumeMm3) {
      return response.badRequest({ error: 'File not analyzed or not found' })
    }

    // region rules (P2) for the chosen delivery country, else the visitor's likely one
    const country = data.country ?? visitorCountry({ request })
    const terms = await new PricingRegionService().termsFor(country)
    const regionalReference = terms.referenceFor(data.material)
    if (!referencePriceFor(data.material) || regionalReference === null) {
      return response.badRequest({ error: `Unknown material: ${data.material}` })
    }

    const profile = data.printProfileId
      ? await new PrintProfileService().resolveForOrder(data.printProfileId)
      : null
    const finishing = await new FinishingService().resolve(data.finishing, data.material)
    const infill = profile ? profile.infillPercent / 100 : data.infill
    const timeFactor = (profile?.timeFactorBps ?? 10_000) / 10_000
    const sliced = await slicedNumbers(file, profile, data.material)
    const gramsPerUnit =
      sliced?.gramsPerUnit ?? estimateGrams(file.volumeMm3, data.material, infill)
    const unitMinutes =
      sliced?.printMinutes ?? Math.ceil(estimatePrintMinutes(gramsPerUnit) * timeFactor)
    const shipping = await new ShippingService().table()
    const shippingMinor = shipping.perUnitMinor({
      country,
      gramsPerUnit,
      bboxMm: bboxOf(file),
      quantity: data.quantity,
    })
    const raw = calculatePrice({
      shippingMinor,
      commissionBps: terms.commissionBps,
      volumeMm3: file.volumeMm3,
      material: data.material,
      pricePerGramMinor: regionalReference,
      quantity: data.quantity,
      sellerMarginBps: 2000, // Default 20% — will come from seller profile
      infill,
      estGrams: sliced ? gramsPerUnit : undefined,
      estPrintMinutes: unitMinutes,
      finishingMinor: finishing?.priceMinor ?? 0,
    })
    // the region's rounding lifts the unit price; the difference is platform commission
    const unitPriceMinor = roundUnitMinor(raw.unitPriceMinor, terms.rounding)
    const breakdown = {
      ...raw,
      platformCommissionMinor: raw.platformCommissionMinor + unitPriceMinor - raw.unitPriceMinor,
      unitPriceMinor,
      totalPriceMinor: unitPriceMinor * data.quantity,
    }

    const printMinutes = unitMinutes * data.quantity
    const eta = await new EtaService().estimate({
      technology: profile?.technology ?? 'FDM',
      printMinutes,
      country,
    })
    // counted once per browser session so the funnel step means "got a price", not "clicked calculate"
    if (!session.has('quoted')) {
      session.put('quoted', true)
      const growth = new GrowthService()
      await growth.track('first_quote', growth.firstTouchOf(user), '/files/quote').catch(() => {})
    }
    return response.json({ breakdown, eta })
  }
}
