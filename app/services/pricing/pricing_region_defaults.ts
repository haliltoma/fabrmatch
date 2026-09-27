export type RoundingRule = 'none' | 'whole' | 'charm99'
export const ROUNDING_RULES: RoundingRule[] = ['none', 'whole', 'charm99']

export interface DefaultPricingRegion {
  code: string
  name: string
  currency: string
  countries: string[]
  isFallback: boolean
}

/**
 * Pricing regions (plan: .plans/regional-pricing.md P2). Seeded neutral — multiplier 100%, global
 * commission, no rounding, no minimum — so nobody's price moves until an admin sets region prices.
 */
export const DEFAULT_PRICING_REGIONS: DefaultPricingRegion[] = [
  { code: 'TR', name: 'Türkiye', currency: 'TRY', countries: ['TR'], isFallback: false },
  {
    code: 'EU',
    name: 'European Union',
    currency: 'EUR',
    countries: [
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IE',
      'IT',
      'LV',
      'LT',
      'LU',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
    ],
    isFallback: false,
  },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP', countries: ['GB'], isFallback: false },
  { code: 'US', name: 'United States', currency: 'USD', countries: ['US'], isFallback: false },
  { code: 'ROW', name: 'Rest of the world', currency: 'USD', countries: [], isFallback: true },
]
