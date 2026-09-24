import db from '@adonisjs/lucid/services/db'
import fabrmatchConfig from '#config/fabrmatch'

/** A counter is shown only when it is big enough not to embarrass; below that the page tells the launch story instead. */
export const HOME_MIN_MAKERS = 3
export const HOME_MIN_RATINGS = 5

export interface HomeStats {
  makers: number | null
  technologies: number | null
  materials: number | null
  ratings: { count: number; average: number } | null
  confirmDays: number
}

export default class HomeStatsService {
  async load(): Promise<HomeStats> {
    const makers = Number(
      (await db.from('manufacturer_profiles').where('status', 'active').count('* as n').first())
        ?.n ?? 0
    )
    const technologies = Number(
      (
        await db
          .from('printers')
          .join(
            'manufacturer_profiles',
            'manufacturer_profiles.id',
            'printers.manufacturer_profile_id'
          )
          .where('manufacturer_profiles.status', 'active')
          .where('printers.is_active', true)
          .countDistinct('printers.technology as n')
          .first()
      )?.n ?? 0
    )
    const materials = Number(
      (await db.from('materials').where('is_active', true).count('* as n').first())?.n ?? 0
    )
    const rated = await db
      .from('production_jobs')
      .whereNotNull('rating')
      .count('* as n')
      .avg('rating as avg')
      .first()
    const ratingCount = Number(rated?.n ?? 0)

    const enough = makers >= HOME_MIN_MAKERS
    return {
      confirmDays: fabrmatchConfig.orders.autoConfirmDays,
      makers: enough ? makers : null,
      technologies: enough && technologies > 0 ? technologies : null,
      materials: materials > 0 ? materials : null,
      ratings:
        ratingCount >= HOME_MIN_RATINGS
          ? { count: ratingCount, average: Math.round(Number(rated?.avg ?? 0) * 10) / 10 }
          : null,
    }
  }
}
