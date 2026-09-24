export interface SliceResult {
  grams: number
  supportGrams: number
  printMinutes: number
  slicer: string
}

/** What the platform needs from a slicer; the CLI worker and the test double both implement it. */
export interface Slicer {
  readonly name: string
  slice(input: { filePath: string; profileCode: string; workDir: string }): Promise<SliceResult>
}

export class SlicerError extends Error {}

/** Reads the totals Orca/Prusa write into the G-code footer. */
export function parseGcodeStats(gcode: string): { grams: number; printMinutes: number } {
  const grams = /;\s*(?:total )?filament used \[g\]\s*=\s*([\d.]+)/i.exec(gcode)
  const time =
    /;\s*estimated printing time(?: \(normal mode\))?\s*=\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i.exec(
      gcode
    )
  if (!grams || !time) throw new SlicerError('The slicer output has no filament or time summary')
  const seconds =
    Number(time[1] ?? 0) * 86_400 +
    Number(time[2] ?? 0) * 3_600 +
    Number(time[3] ?? 0) * 60 +
    Number(time[4] ?? 0)
  return { grams: Number(grams[1]), printMinutes: Math.max(1, Math.ceil(seconds / 60)) }
}
