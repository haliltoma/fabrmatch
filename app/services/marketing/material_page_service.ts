import db from '@adonisjs/lucid/services/db'
import Material from '#models/material'

/**
 * A material page is only indexed, and only shows numbers, when at least this many active makers
 * print the material. Below it a single maker's rate could be read off the page, and the page would
 * be thin content with nothing real to say (docs/marketing/keywords-tr.md §3.2).
 */
export const MIN_MAKERS_FOR_MATERIAL_PAGE = 3

export interface MaterialPage {
  code: string
  slug: string
  name: string
  technology: string
  /** Null until the threshold is met: no count, no range. */
  makers: number | null
  rate: { minMinor: number; maxMinor: number; currency: string } | null
  indexable: boolean
}

export default class MaterialPageService {
  async list(): Promise<MaterialPage[]> {
    const materials = await Material.query().where('isActive', true).orderBy('name', 'asc')
    // Active, approved makers with an active printer that offers the material. Counted per material
    // and currency; only counts and a min/max leave this method, never who the makers are.
    const rows = await db
      .from('printer_materials as pm')
      .join('printers as p', 'p.id', 'pm.printer_id')
      .join('manufacturer_profiles as mp', 'mp.id', 'p.manufacturer_profile_id')
      .where('p.is_active', true)
      .where('mp.status', 'active')
      .groupBy('pm.material', 'pm.currency')
      .select('pm.material', 'pm.currency')
      .countDistinct('mp.id as makers')
      .min('pm.price_per_gram_minor as min_rate')
      .max('pm.price_per_gram_minor as max_rate')

    return materials.map((m) => {
      const own = rows
        .filter((r) => String(r.material).toUpperCase() === m.code.toUpperCase())
        .sort((a, b) => Number(b.makers) - Number(a.makers))
      const top = own[0]
      const makers = top ? Number(top.makers) : 0
      const enough = makers >= MIN_MAKERS_FOR_MATERIAL_PAGE
      return {
        code: m.code,
        slug: m.code.toLowerCase(),
        name: m.name,
        technology: m.technology,
        makers: enough ? makers : null,
        rate: enough
          ? {
              minMinor: Number(top.min_rate),
              maxMinor: Number(top.max_rate),
              currency: String(top.currency),
            }
          : null,
        indexable: enough,
      }
    })
  }

  async find(slug: string): Promise<MaterialPage | null> {
    const all = await this.list()
    return all.find((m) => m.slug === slug.toLowerCase()) ?? null
  }
}
