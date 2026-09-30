/**
 * Timeline of the hero scene as pure functions of time, so the drawing only renders what this
 * returns and the motion can be unit-tested. Units are SVG user units (viewBox 640×400).
 */
export const LOOP_SECONDS = 14

export const ARM = {
  shoulder: { x: 86, y: 246 },
  lengths: [124, 112, 40] as const,
  headLength: 40,
}

/** Vase, drawn from the 120-unit PrintArt path, stood on its bottom-centre. */
export const VASE_SCALE = 0.55
export const VASE_HEIGHT = 96 * VASE_SCALE
const BED_TOP = 296
const VASE_X = 222
export const BOX = { x: 286, top: 246, width: 88, height: 58, slide: 96 }
const BOX_CENTER = BOX.x + BOX.width / 2
const LIFT_Y = 188

export type Step = 'printing' | 'packing' | 'shipping' | 'delivered'

export interface Pose {
  shoulder: number
  elbow: number
  wrist: number
  head: number
}

const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (k: number) => {
  const x = clamp(k)
  return x * x * (3 - 2 * x)
}
/** 0→1 progress of t through [start, end], eased. */
const span = (t: number, start: number, end: number) => ease((t - start) / (end - start))
const deg = (r: number) => (r * 180) / Math.PI
const rad = (d: number) => (d * Math.PI) / 180
/**
 * Rounds a drawn value. Node (server render) and the browser can disagree in the last digits of
 * Math.sin/cos/atan2; rounding keeps the server SVG and the hydrated one identical.
 */
export const fix = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places

/**
 * Inverse kinematics for a nozzle tip that always points straight down. The last link's absolute
 * angle eases from 50° over the bed to 10° far out, which keeps the elbow natural at full reach.
 */
export function solveArm(tip: { x: number; y: number }): Pose {
  const { shoulder: s, lengths, headLength } = ARM
  const [l1, l2, l3] = lengths
  const phi3 = lerp(50, 10, clamp((tip.x - VASE_X) / (BOX_CENTER - VASE_X)))
  const wx = tip.x
  const wy = tip.y - headLength
  const ex = wx - l3 * Math.cos(rad(phi3)) - s.x
  const ey = wy - l3 * Math.sin(rad(phi3)) - s.y
  const d = Math.min(Math.hypot(ex, ey), l1 + l2 - 0.01)
  const base = Math.atan2(ey, ex)
  const inner = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
  const a1 = base - inner
  const elbowX = l1 * Math.cos(a1)
  const elbowY = l1 * Math.sin(a1)
  const a2 = Math.atan2(ey - elbowY, ex - elbowX)
  return {
    shoulder: fix(deg(a1), 3),
    elbow: fix(deg(a2 - a1), 3),
    wrist: fix(phi3 - deg(a2), 3),
    head: fix(90 - phi3, 3),
  }
}

/** Positions of the shoulder, elbow, wrist-link start, wrist and the nozzle tip for a pose. */
export function armJoints(pose: Pose) {
  const { shoulder, lengths, headLength } = ARM
  const pts = [{ ...shoulder }]
  let angle = 0
  ;[pose.shoulder, pose.elbow, pose.wrist].forEach((turn, i) => {
    angle += turn
    const p = pts[pts.length - 1]
    pts.push({
      x: fix(p.x + lengths[i] * Math.cos(rad(angle))),
      y: fix(p.y + lengths[i] * Math.sin(rad(angle))),
    })
  })
  const w = pts[pts.length - 1]
  const heading = angle + pose.head
  return {
    joints: pts,
    tip: {
      x: fix(w.x + headLength * Math.cos(rad(heading))),
      y: fix(w.y + headLength * Math.sin(rad(heading))),
    },
  }
}

/** Half width of the vase at a height above its bottom (from the PrintArt outline). */
function vaseHalfWidth(fromBottom: number) {
  const y = 110 - fromBottom / VASE_SCALE
  const points: Array<[number, number]> = [
    [110, 15],
    [92, 30],
    [66, 33],
    [40, 26],
    [14, 18],
  ]
  for (let i = 0; i < points.length - 1; i++) {
    const [y0, h0] = points[i]
    const [y1, h1] = points[i + 1]
    if (y <= y0 && y >= y1) return lerp(h0, h1, (y0 - y) / (y0 - y1)) * VASE_SCALE
  }
  return 18 * VASE_SCALE
}

export interface Scene {
  step: Step
  tip: { x: number; y: number }
  pose: Pose
  /** y of the top of the printed part, while it is on the bed */
  printedTo: number
  vase: { mode: 'printing' | 'held' | 'boxed' | 'gone'; bottom: { x: number; y: number } }
  extruding: boolean
  box: { dx: number; flaps: number; tape: number; toCourier: number; opacity: number }
  parcel: 'none' | 'courier' | 'buyer'
  courierX: number
  handover: number
  tick: number
}

/**
 * 0–5.5 s print · 5.5–8 s lift, carry, drop · 8–9 s close the carton · 9–10.5 s along the belt ·
 * 10.5–11 s to the courier · 11–12.3 s walk to the door · 12.3–12.8 s hand-over · then the tick.
 */
export function sceneAt(time: number): Scene {
  const t = ((time % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS
  const home = { x: 170, y: 150 }
  let tip = { x: VASE_X, y: BED_TOP - 3 }
  let printedTo = BED_TOP
  let mode: Scene['vase']['mode'] = 'printing'
  let bottom = { x: VASE_X, y: BED_TOP }
  let extruding = false

  if (t < 5.5) {
    const k = t / 5.5
    printedTo = BED_TOP - VASE_HEIGHT * k
    const sweep = Math.sin(t * Math.PI * 2 * 1.4)
    tip = { x: VASE_X + sweep * vaseHalfWidth(VASE_HEIGHT * k), y: printedTo - 3 }
    extruding = true
  } else if (t < 8) {
    printedTo = BED_TOP - VASE_HEIGHT
    const grip = { x: VASE_X, y: BED_TOP - VASE_HEIGHT - 3 }
    const drop = { x: BOX_CENTER, y: BOX.top + BOX.height - 4 - VASE_HEIGHT - 3 }
    if (t < 6) {
      tip = grip
    } else {
      mode = 'held'
      const up = span(t, 6, 6.5)
      const across = span(t, 6.5, 7.3)
      const down = span(t, 7.3, 7.8)
      tip = {
        x: lerp(grip.x, drop.x, across),
        y: lerp(lerp(grip.y, LIFT_Y, up), drop.y, down),
      }
      if (t >= 7.8) mode = 'boxed'
    }
    bottom = { x: tip.x, y: tip.y + 3 + VASE_HEIGHT }
    if (mode === 'boxed') bottom = { x: BOX_CENTER, y: BOX.top + BOX.height - 4 }
  } else {
    mode = t < 10.5 ? 'boxed' : 'gone'
    bottom = { x: BOX_CENTER, y: BOX.top + BOX.height - 4 }
    // arm backs away to its rest pose, then waits for the next job
    const back = span(t, 8, 9)
    const out = span(t, 13.2, 14)
    const drop = { x: BOX_CENTER, y: BOX.top + BOX.height - 4 - VASE_HEIGHT - 3 }
    tip =
      t < 13.2
        ? { x: lerp(drop.x, home.x, back), y: lerp(drop.y, home.y, back) }
        : { x: lerp(home.x, VASE_X, out), y: lerp(home.y, BED_TOP - 3, out) }
  }
  const flaps = span(t, 8, 9)
  const tape = span(t, 8.8, 9.2)
  const slide = span(t, 9.2, 10.5)
  const toCourier = span(t, 10.5, 11)
  const walk = span(t, 11, 12.3)
  const handover = span(t, 12.3, 12.8)
  const fadeIn = span(t, 0, 0.5)

  let parcel: Scene['parcel'] = 'none'
  if (t >= 11 && t < 12.8) parcel = 'courier'
  if (t >= 12.8) parcel = 'buyer'

  const step: Step =
    t < 5.5 ? 'printing' : t < 9.2 ? 'packing' : t < 12.8 ? 'shipping' : 'delivered'

  return {
    step,
    tip,
    pose: solveArm(tip),
    printedTo,
    vase: { mode, bottom },
    extruding,
    box: {
      dx: BOX.slide * slide,
      flaps,
      tape,
      toCourier,
      opacity: t < 10.5 ? fadeIn : 1 - toCourier,
    },
    parcel,
    courierX: lerp(504, 540, walk) - lerp(0, 36, span(t, 13.3, 14)),
    handover,
    tick: span(t, 12.8, 13.1) * (1 - span(t, 13.6, 14)),
  }
}

/** Frame shown when motion is reduced: the delivered state, everything visible. */
export const STILL_TIME = 13.2
