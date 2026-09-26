/**
 * Starting list; an admin edits prices and adds options in /admin/finishing. Prices are per unit,
 * TRY minor; extra days are added to the maker's production deadline.
 */
export const DEFAULT_FINISHINGS: Array<
  [
    code: string,
    name: string,
    description: string,
    priceMinor: number,
    materials: string[] | null,
    extraDays: number,
    needsColour?: boolean,
  ]
> = [
  ['SAND', 'Sanded', 'Hand-sanded to remove layer lines and support marks.', 1500, null, 1],
  ['PRIME', 'Primed', 'Sanded and coated with a sandable primer, ready to paint.', 2500, null, 2],
  [
    'PAINT',
    'Primed and painted',
    'Sanded, primed and painted in one colour of your choice.',
    6000,
    null,
    3,
    true,
  ],
  [
    'VAPOR',
    'Vapour smoothed',
    'Chemical smoothing for a glossy, sealed surface (ABS only).',
    3000,
    ['ABS'],
    1,
  ],
]
