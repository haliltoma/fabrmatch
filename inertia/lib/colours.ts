/** A chosen filament colour with the part it is for (Paket Y). */
export type ItemColour = { name: string; part: string | null }

/** "Red (head) + Blue (body)", or the single colour; empty when none was chosen. */
export function colourLabel(
  colours: ItemColour[] | undefined,
  color: string | null,
  t: (text: string) => string
): string {
  if (colours && colours.length > 0) {
    return colours.map((c) => (c.part ? `${t(c.name)} (${c.part})` : t(c.name))).join(' + ')
  }
  return color ? t(color.charAt(0).toUpperCase() + color.slice(1)) : ''
}
