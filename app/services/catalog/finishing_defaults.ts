/** Starting list; an admin edits prices and adds options in /admin/finishing. Prices are per unit, TRY minor. */
export const DEFAULT_FINISHINGS: Array<
  [code: string, name: string, description: string, priceMinor: number, materials: string[] | null]
> = [
  ['SAND', 'Sanded', 'Hand-sanded to remove layer lines and support marks.', 1500, null],
  ['PRIME', 'Primed', 'Sanded and coated with a sandable primer, ready to paint.', 2500, null],
  [
    'PAINT',
    'Primed and painted',
    'Sanded, primed and painted in one colour of your choice.',
    6000,
    null,
  ],
  [
    'VAPOR',
    'Vapour smoothed',
    'Chemical smoothing for a glossy, sealed surface (ABS only).',
    3000,
    ['ABS'],
  ],
]
