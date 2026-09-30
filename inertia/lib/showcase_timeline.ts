/**
 * Timing of the "what you can print" printer (components/print_showcase.tsx). One cycle prints one
 * part: the head zigzags up from the bed to the top of the part, lifts away, holds while the part is
 * admired, then drops back to the bed as the next part starts. Pure so it can be unit-tested.
 */

export const CYCLE_SECONDS = 5.4

/** Stage coordinates (the SVG is 240 × 210). */
export const BED_Y = 174
export const TOP_Y = 72
export const PARK = { x: 204, y: 34 }
export const SPAN = { left: 86, right: 154 }

const PRINT_END = 0.64
const LIFT_END = 0.72
const HOLD_END = 0.9
const PASSES = 14

export interface HeadKeyframes {
  x: number[]
  y: number[]
  times: number[]
}

/** Keyframes for the print head (nozzle tip) and the reveal line, all on one shared time axis. */
export function headKeyframes(): HeadKeyframes {
  const x: number[] = []
  const y: number[] = []
  const times: number[] = []
  for (let i = 0; i <= PASSES; i++) {
    const p = i / PASSES
    times.push(p * PRINT_END)
    x.push(i % 2 === 0 ? SPAN.left : SPAN.right)
    y.push(BED_Y - (BED_Y - TOP_Y) * p)
  }
  times.push(LIFT_END, HOLD_END, 1)
  x.push(PARK.x, PARK.x, SPAN.left)
  y.push(PARK.y, PARK.y, BED_Y)
  return { x, y, times }
}

/** The printed height follows the head up and then stays put until the part is swapped. */
export function revealKeyframes(): { y: number[]; times: number[] } {
  return { y: [BED_Y, TOP_Y, TOP_Y], times: [0, PRINT_END, 1] }
}
