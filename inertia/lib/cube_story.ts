/**
 * Timeline of the four-faced hero cube as pure functions of time (unit-tested):
 * shop (a buyer picks a design) → order (places it, payment held) → make (print, pack, deliver)
 * → paid (payment released, the seller's margin arrives), then back to the shop.
 */
/** journey.ts STILL_TIME: the parcel is delivered (kept import-free so unit tests load it directly) */
export const JOURNEY_DELIVERED = 13.2

export const FACES = ['shop', 'order', 'make', 'paid'] as const
export type Face = (typeof FACES)[number]

const TURN = 0.8
/** How long each face holds before the cube turns on (the make face: the whole journey + 1 s). */
const HOLD = [6.4, 5.4, JOURNEY_DELIVERED + 2, 5.4]
/** When each face has fully turned to the front (the shop is there from 0). */
const SHOWN_AT = [0]
for (let i = 1; i < HOLD.length; i++) SHOWN_AT.push(SHOWN_AT[i - 1] + HOLD[i - 1] + TURN)

export const STORY_SECONDS = SHOWN_AT[3] + HOLD[3] + TURN
/**
 * Frame for the server render and where the loop starts: the shop before anything happens, so the
 * page settles for ~2 s before the cursor moves (and the first turn is 6 s away).
 */
export const STORY_STILL = 0
/** Cursor scripts: [start moving, arrive (hover), click], seconds into the face. */
export const SHOP_CURSOR = [2, 3.4, 4.1] as const
export const ORDER_CURSOR = [1, 2.2, 2.8] as const

const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
const ease = (k: number) => {
  const x = clamp(k)
  return x * x * (3 - 2 * x)
}

export interface Story {
  /** turns done so far, 0…4 (fractional while turning); the cube is rotated by −90° per turn */
  turns: number
  /** the face nearest the front */
  face: number
  /** seconds since each face came to the front (0 until it has) */
  local: [number, number, number, number]
  /** time to drive the print-to-door scene with */
  journey: number
}

export function storyAt(time: number): Story {
  const t = ((time % STORY_SECONDS) + STORY_SECONDS) % STORY_SECONDS
  let turns = 0
  for (let i = 0; i < FACES.length; i++) {
    const start = SHOWN_AT[i] + HOLD[i]
    turns += ease((t - start) / TURN)
  }
  const local = SHOWN_AT.map((at) => Math.max(0, t - at)) as Story['local']
  return {
    turns,
    face: Math.round(turns) % FACES.length,
    local,
    journey: Math.min(local[2], JOURNEY_DELIVERED),
  }
}

/** Cursor script for the shop and order faces: where it is (0…1 of the path) and click state. */
export function cursorAt(local: number, moveFrom: number, moveTo: number, clickAt: number) {
  return {
    travel: ease((local - moveFrom) / (moveTo - moveFrom)),
    hovering: local >= moveTo,
    pressed: local >= clickAt && local < clickAt + 0.18,
    clicked: local >= clickAt,
  }
}
