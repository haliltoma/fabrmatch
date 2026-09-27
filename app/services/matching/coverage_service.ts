import db from '@adonisjs/lucid/services/db'

/**
 * Whether any active maker with an active printer is in a country. Orders are matched within the
 * delivery country (cross-border is off, K-K), so without one an order there cannot be printed.
 * Only a yes/no leaves this service (business rule 1).
 */
export default class CoverageService {
  async servesCountry(country: string): Promise<boolean> {
    const row = await db
      .from('manufacturer_profiles as mp')
      .where('mp.status', 'active')
      .where('mp.country', country.trim().toUpperCase())
      .whereExists((q) =>
        q
          .from('printers as p')
          .whereRaw('p.manufacturer_profile_id = mp.id')
          .where('p.is_active', true)
      )
      .select('mp.id')
      .first()
    return !!row
  }
}
