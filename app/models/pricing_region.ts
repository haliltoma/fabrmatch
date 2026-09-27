import { PricingRegionSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import PricingRegionMaterial from '#models/pricing_region_material'
import type { RoundingRule } from '#services/pricing/pricing_region_defaults'

/** A group of countries priced by its own rules (P2, .plans/regional-pricing.md). */
export default class PricingRegion extends PricingRegionSchema {
  declare rounding: RoundingRule

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare countries: string[]

  @hasMany(() => PricingRegionMaterial)
  declare materials: HasMany<typeof PricingRegionMaterial>
}
