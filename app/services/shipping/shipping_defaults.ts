export interface ShippingZoneSeed {
  code: string
  name: string
  countries: string[]
  isFallback: boolean
  extraPerKgMinor: number
  tiers: Array<[upToGrams: number, priceMinor: number]>
}

// PLACEHOLDER rates in TRY minor units until the carrier contract (decision D3) fixes real ones;
// the admin can edit every value at /admin/shipping.
export const DEFAULT_SHIPPING_ZONES: ShippingZoneSeed[] = [
  {
    code: 'TR',
    name: 'Türkiye',
    countries: ['TR'],
    isFallback: false,
    extraPerKgMinor: 1500,
    tiers: [
      [500, 4500],
      [1000, 5500],
      [2000, 7000],
      [5000, 10000],
      [10000, 15000],
    ],
  },
  {
    code: 'EU',
    name: 'Europe',
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
      'GB',
      'NO',
      'CH',
    ],
    isFallback: false,
    extraPerKgMinor: 8000,
    tiers: [
      [500, 25000],
      [1000, 32000],
      [2000, 45000],
      [5000, 70000],
      [10000, 110000],
    ],
  },
  {
    code: 'WORLD',
    name: 'Rest of the world',
    countries: [],
    isFallback: true,
    extraPerKgMinor: 10000,
    tiers: [
      [500, 35000],
      [1000, 45000],
      [2000, 60000],
      [5000, 95000],
      [10000, 150000],
    ],
  },
]
