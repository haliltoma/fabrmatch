import db from '@adonisjs/lucid/services/db'
import { slugify } from '#services/storefront/storefront_service'

/**
 * A city page is indexed, and shows numbers, only when at least this many active makers print
 * there. Fewer, and a single workshop could be singled out (business rule 1) and the page would
 * say nothing real (M2-T3: only pages with real data are published).
 */
export const MIN_MAKERS_FOR_CITY_PAGE = 3

export interface CityPage {
  slug: string
  city: string
  country: string
  /** Null below the threshold: no count, no materials, no rates. */
  makers: number | null
  /** Materials at least MIN makers print in this city, with their per-gram rate range. */
  materials: Array<{ code: string; minMinor: number; maxMinor: number; currency: string }>
  indexable: boolean
}

const cityKey = (city: string, country: string) =>
  `${city.trim().toLocaleLowerCase('tr')}|${country.toUpperCase()}`

export default class CityPageService {
  async list(): Promise<CityPage[]> {
    // active makers with at least one active printer, per city; only counts leave this method
    const makers = await db
      .from('manufacturer_profiles as mp')
      .whereExists((q) =>
        q
          .from('printers as p')
          .whereRaw('p.manufacturer_profile_id = mp.id')
          .where('p.is_active', true)
      )
      .where('mp.status', 'active')
      .whereNotNull('mp.city')
      .select('mp.id', 'mp.city', 'mp.country')
    const byCity = new Map<string, { city: string; country: string; ids: Set<string> }>()
    for (const m of makers) {
      const key = cityKey(m.city, m.country)
      const entry = byCity.get(key) ?? {
        city: String(m.city).trim(),
        country: String(m.country).toUpperCase(),
        ids: new Set<string>(),
      }
      entry.ids.add(m.id)
      byCity.set(key, entry)
    }

    const rates = await db
      .from('printer_materials as pm')
      .join('printers as p', 'p.id', 'pm.printer_id')
      .join('manufacturer_profiles as mp', 'mp.id', 'p.manufacturer_profile_id')
      .where('p.is_active', true)
      .where('mp.status', 'active')
      .whereNotNull('mp.city')
      .select(
        'mp.id as maker',
        'mp.city',
        'mp.country',
        'pm.material',
        'pm.currency',
        // makers enter their cost per kg; the page shows it per gram, as before
        db.raw('ceil(pm.material_cost_per_kg_minor / 1000.0)::int as rate')
      )

    const pages: CityPage[] = []
    for (const [key, entry] of byCity) {
      const count = entry.ids.size
      const enough = count >= MIN_MAKERS_FOR_CITY_PAGE
      const here = rates.filter((r) => cityKey(r.city, r.country) === key)
      const perMaterial = new Map<
        string,
        { makers: Set<string>; min: number; max: number; currency: string }
      >()
      for (const r of here) {
        const code = String(r.material).toUpperCase()
        const m = perMaterial.get(`${code}|${r.currency}`) ?? {
          makers: new Set<string>(),
          min: Number.MAX_SAFE_INTEGER,
          max: 0,
          currency: String(r.currency),
        }
        m.makers.add(r.maker)
        m.min = Math.min(m.min, Number(r.rate))
        m.max = Math.max(m.max, Number(r.rate))
        perMaterial.set(`${code}|${r.currency}`, m)
      }
      const materials = enough
        ? [...perMaterial.entries()]
            .filter(([, m]) => m.makers.size >= MIN_MAKERS_FOR_CITY_PAGE)
            .map(([k, m]) => ({
              code: k.split('|')[0],
              minMinor: m.min,
              maxMinor: m.max,
              currency: m.currency,
            }))
            .sort((a, b) => a.code.localeCompare(b.code))
        : []
      pages.push({
        slug:
          entry.country === 'TR'
            ? slugify(entry.city)
            : `${slugify(entry.city)}-${entry.country.toLowerCase()}`,
        city: entry.city,
        country: entry.country,
        makers: enough ? count : null,
        materials,
        indexable: enough,
      })
    }
    return pages.sort(
      (a, b) => (b.makers ?? 0) - (a.makers ?? 0) || a.city.localeCompare(b.city, 'tr')
    )
  }

  async find(slug: string): Promise<CityPage | null> {
    const pages = await this.list()
    return pages.find((c) => c.slug === slug.toLowerCase()) ?? null
  }
}
