/** Platform reference material prices (minor units per gram) — will move to admin config */
export const REFERENCE_PRICES: Record<string, { pricePerGramMinor: number; label: string }> = {
  PLA: { pricePerGramMinor: 50, label: 'PLA' },
  PETG: { pricePerGramMinor: 60, label: 'PETG' },
  ABS: { pricePerGramMinor: 55, label: 'ABS' },
  TPU: { pricePerGramMinor: 80, label: 'TPU' },
  NYLON: { pricePerGramMinor: 90, label: 'Nylon' },
  RESIN: { pricePerGramMinor: 150, label: 'Resin' },
}

export function referencePriceFor(material: string) {
  return REFERENCE_PRICES[material.toUpperCase()] ?? null
}
