import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import PricingRegion from '#models/pricing_region'
import PricingRegionMaterial from '#models/pricing_region_material'
import { BASE_CURRENCY, FOREIGN_CURRENCIES } from '#services/pricing/fx'
import { ROUNDING_RULES, type RoundingRule } from '#services/pricing/pricing_region_defaults'
import { REFERENCE_PRICES, referencePriceFor } from '#services/pricing/reference_prices'

/**
 * Lifts a unit price to the region's rounding rule. Never lowers it, so the maker's share and the
 * shipping are always covered; the difference is added to the platform commission by the caller.
 */
export function roundUnitMinor(minor: number, rule: RoundingRule): number {
  if (rule === 'whole') return Math.ceil(minor / 100) * 100
  if (rule === 'charm99') return Math.floor(minor / 100) * 100 + 99
  return minor
}

/** The region's own price when it has one, else the base price scaled by its multiplier (up). */
export function regionalReferenceMinor(
  baseMinor: number,
  multiplierBps: number,
  overrideMinor: number | null
): number {
  if (overrideMinor !== null) return overrideMinor
  return Math.ceil((baseMinor * multiplierBps) / 10_000)
}

/** What browse prices (shop, quotes) need from a region, resolved once per request. */
export interface BrowseTerms {
  country: string
  regionId: string
  commissionBps?: number
  rounding: RoundingRule
  referenceFor(material: string): number | null
}

export default class PricingRegionService {
  async termsFor(country: string): Promise<BrowseTerms> {
    const region = await this.forCountry(country)
    return {
      country: country.trim().toUpperCase(),
      regionId: region.id,
      commissionBps: region.commissionBps ?? undefined,
      rounding: region.rounding,
      referenceFor: (material) => this.referenceFor(region, material),
    }
  }

  /** The region a delivery country belongs to; the fallback region when none lists it. */
  async forCountry(country: string): Promise<PricingRegion> {
    const code = country.trim().toUpperCase()
    const region =
      (await PricingRegion.query()
        .whereRaw('countries @> ?::jsonb', [JSON.stringify([code])])
        .preload('materials')
        .first()) ??
      (await PricingRegion.query().where('isFallback', true).preload('materials').firstOrFail())
    return region
  }

  /** Reference price per gram in this region, or null for a material the platform does not sell. */
  referenceFor(region: PricingRegion, material: string): number | null {
    const base = referencePriceFor(material)
    if (!base) return null
    const override = region.materials?.find(
      (m) => m.material.toUpperCase() === material.toUpperCase()
    )
    return regionalReferenceMinor(
      base.pricePerGramMinor,
      region.referenceMultiplierBps,
      override?.pricePerGramMinor ?? null
    )
  }
}

export class PricingRegionError extends DomainError {}

export interface RegionChanges {
  name?: string
  currency?: string
  countries?: string[]
  referenceMultiplierBps?: number
  commissionBps?: number | null
  minOrderMinor?: number
  rounding?: RoundingRule
  currencyMode?: 'converted' | 'local'
  /** null = the global FX buffer */
  fxBufferBps?: number | null
}

/** Admin side of pricing regions (P2-T9): every change is validated here and audited. */
export class PricingRegionAdmin {
  list() {
    return PricingRegion.query()
      .preload('materials')
      .orderBy('isFallback', 'asc')
      .orderBy('id', 'asc')
  }

  async create(data: { code: string; name: string } & RegionChanges, adminId: string) {
    const code = data.code.trim().toUpperCase()
    if (!/^[A-Z0-9]{2,16}$/.test(code)) {
      throw new PricingRegionError('A region code is 2 to 16 letters or digits')
    }
    if (await PricingRegion.findBy('code', code)) {
      throw new PricingRegionError('A region with this code already exists')
    }
    return db.transaction(async (trx) => {
      const region = new PricingRegion().useTransaction(trx)
      region.merge({ code, name: data.name.trim(), currency: BASE_CURRENCY, countries: [] })
      await this.apply(region, data, trx)
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'pricing_region.created',
          subjectType: 'pricing_region',
          subjectId: region.id,
          meta: { ...data, code },
        },
        { client: trx }
      )
      return region
    })
  }

  async update(id: string, changes: RegionChanges, adminId: string) {
    return db.transaction(async (trx) => {
      const region = await PricingRegion.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .firstOrFail()
      await this.apply(region, changes, trx)
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'pricing_region.updated',
          subjectType: 'pricing_region',
          subjectId: region.id,
          meta: { ...changes },
        },
        { client: trx }
      )
      return region
    })
  }

  /** A region's own price per gram for one material; null removes it (back to the multiplier). */
  async setMaterialPrice(
    regionId: string,
    material: string,
    pricePerGramMinor: number | null,
    adminId: string
  ) {
    const code = material.trim().toUpperCase()
    if (!REFERENCE_PRICES[code]) throw new PricingRegionError(`Unknown material: ${code}`)
    if (
      pricePerGramMinor !== null &&
      (!Number.isInteger(pricePerGramMinor) || pricePerGramMinor < 1 || pricePerGramMinor > 100_000)
    ) {
      throw new PricingRegionError('The price per gram must be between 0.01 and 1,000.00')
    }
    const region = await PricingRegion.findOrFail(regionId)
    await db.transaction(async (trx) => {
      await PricingRegionMaterial.query({ client: trx })
        .where('pricingRegionId', region.id)
        .where('material', code)
        .delete()
      if (pricePerGramMinor !== null) {
        await PricingRegionMaterial.create(
          { pricingRegionId: region.id, material: code, pricePerGramMinor },
          { client: trx }
        )
      }
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'pricing_region.material_price',
          subjectType: 'pricing_region',
          subjectId: region.id,
          meta: { material: code, pricePerGramMinor },
        },
        { client: trx }
      )
    })
  }

  private async apply(
    region: PricingRegion,
    changes: RegionChanges,
    trx: TransactionClientContract
  ) {
    if (changes.name !== undefined) {
      const name = changes.name.trim()
      if (name.length < 2 || name.length > 80) {
        throw new PricingRegionError('A region name is 2 to 80 characters')
      }
      region.name = name
    }
    if (changes.currency !== undefined) {
      const currency = changes.currency.toUpperCase()
      if (
        currency !== BASE_CURRENCY &&
        !(FOREIGN_CURRENCIES as readonly string[]).includes(currency)
      ) {
        throw new PricingRegionError(`Prices in ${currency} are not available`)
      }
      region.currency = currency
    }
    if (changes.referenceMultiplierBps !== undefined) {
      const bps = changes.referenceMultiplierBps
      if (!Number.isInteger(bps) || bps < 1000 || bps > 100_000) {
        throw new PricingRegionError('The price level must be between 10% and 1000%')
      }
      region.referenceMultiplierBps = bps
    }
    if (changes.commissionBps !== undefined) {
      const bps = changes.commissionBps
      if (bps !== null && (!Number.isInteger(bps) || bps < 0 || bps > 5000)) {
        throw new PricingRegionError('The commission must be between 0% and 50%')
      }
      region.commissionBps = bps
    }
    if (changes.minOrderMinor !== undefined) {
      const minor = changes.minOrderMinor
      if (!Number.isInteger(minor) || minor < 0 || minor > 10_000_000) {
        throw new PricingRegionError('The minimum order must be between 0 and 100,000.00')
      }
      region.minOrderMinor = minor
    }
    if (changes.rounding !== undefined) {
      if (!ROUNDING_RULES.includes(changes.rounding)) {
        throw new PricingRegionError('Unknown rounding rule')
      }
      region.rounding = changes.rounding
    }
    if (changes.currencyMode !== undefined) {
      if (!['converted', 'local'].includes(changes.currencyMode)) {
        throw new PricingRegionError('Unknown currency mode')
      }
      region.currencyMode = changes.currencyMode
    }
    if (changes.fxBufferBps !== undefined) {
      const bps = changes.fxBufferBps
      if (bps !== null && (!Number.isInteger(bps) || bps < 0 || bps > 2000)) {
        throw new PricingRegionError('The FX buffer must be between 0% and 20%')
      }
      region.fxBufferBps = bps
    }
    if (changes.countries !== undefined && !region.isFallback) {
      const countries = [...new Set(changes.countries.map((c) => c.trim().toUpperCase()))].filter(
        Boolean
      )
      if (countries.some((c) => !/^[A-Z]{2}$/.test(c))) {
        throw new PricingRegionError('Countries are two-letter codes, like DE or GB')
      }
      const others = PricingRegion.query({ client: trx })
      // a new region (no id yet) clashes with any existing one
      if (region.id) others.whereNot('id', region.id)
      const taken = await others
        .whereRaw('jsonb_exists_any(countries, ?::text[])', [countries])
        .first()
      if (taken) {
        const clash = countries.filter((c) => taken.countries.includes(c))
        throw new PricingRegionError(
          `${clash.join(', ')} already belongs to the ${taken.name} region`
        )
      }
      region.countries = countries
    }
    await region.save()
  }
}
