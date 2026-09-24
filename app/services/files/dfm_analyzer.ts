export type Vec = [number, number, number]
export interface DfmTriangle {
  v1: Vec
  v2: Vec
  v3: Vec
}

export type DfmLevel = 'info' | 'warning' | 'blocker'
export interface DfmIssue {
  code: string
  level: DfmLevel
  message: string
}

const BLOCKER_THIN_MM = 0.4
const WARN_THIN_MM = 1
const TINY_MM = 3
const OVERHANG_LIMIT = -Math.cos((45 * Math.PI) / 180)
const OVERHANG_WARN_SHARE = 0.1
const BED_TOLERANCE_MM = 0.2

function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

/**
 * Design-for-manufacture checks on a triangle mesh (build direction = +Z). These are geometric
 * heuristics, not a slicer: wall thickness in particular is approximated from the bounding box,
 * real ray-cast thickness arrives with the slicer worker (R2-T1).
 */
export function analyzeDfm(
  triangles: DfmTriangle[],
  facts: { signedVolume: number; bbox: Vec }
): DfmIssue[] {
  const issues: DfmIssue[] = []
  const smallest = Math.min(...facts.bbox)
  const largest = Math.max(...facts.bbox)

  if (smallest < BLOCKER_THIN_MM) {
    issues.push({
      code: 'too_thin',
      level: 'blocker',
      message: `The model is only ${smallest.toFixed(2)} mm thick in one direction — too thin to print. Thicken it to at least ${WARN_THIN_MM} mm.`,
    })
  } else if (smallest < WARN_THIN_MM) {
    issues.push({
      code: 'thin',
      level: 'warning',
      message: `One side is under ${WARN_THIN_MM} mm (${smallest.toFixed(2)} mm). Thin parts may break or not print.`,
    })
  }
  if (largest < TINY_MM) {
    issues.push({
      code: 'tiny',
      level: 'warning',
      message: `The whole model is under ${TINY_MM} mm. Check the units — was it exported in metres or inches?`,
    })
  }

  if (facts.signedVolume < 0) {
    issues.push({
      code: 'inverted_normals',
      level: 'warning',
      message:
        'The surface normals point inward. We price it as a solid, but the maker may need to repair it.',
    })
  }

  const overhang = overhangShare(triangles)
  if (overhang > OVERHANG_WARN_SHARE) {
    issues.push({
      code: 'overhang',
      level: 'warning',
      message: `About ${Math.round(overhang * 100)}% of the surface overhangs by more than 45°. It will need supports, which adds print time and rough surfaces.`,
    })
  }

  if (overhang > OVERHANG_WARN_SHARE) {
    const better = betterOrientation(triangles, overhang)
    if (better) {
      issues.push({
        code: 'better_orientation',
        level: 'info',
        message: `Printing it with its ${better.axis} axis pointing up would cut the overhang from about ${Math.round(overhang * 100)}% to ${Math.round(better.share * 100)}%, so it needs fewer supports. Re-export the model in that orientation, or ask the maker to rotate it.`,
      })
    }
  }

  const bodies = countBodies(triangles)
  if (bodies.stray > 0) {
    issues.push({
      code: 'floating_parts',
      level: 'warning',
      message: `${bodies.stray} tiny loose fragment${bodies.stray === 1 ? '' : 's'} not attached to the model. Remove them or they may print as debris.`,
    })
  }
  if (bodies.solid > 1) {
    issues.push({
      code: 'multiple_bodies',
      level: 'info',
      message: `The file contains ${bodies.solid} separate parts; they print together on one plate.`,
    })
  }
  return issues
}

/** Share of surface area (0–1) facing down steeper than 45° and not resting on the bed. */
export function overhangShare(triangles: DfmTriangle[]): number {
  let minZ = Infinity
  for (const t of triangles) minZ = Math.min(minZ, t.v1[2], t.v2[2], t.v3[2])

  let total = 0
  let over = 0
  for (const t of triangles) {
    const n = cross(sub(t.v2, t.v1), sub(t.v3, t.v1))
    const twiceArea = Math.hypot(n[0], n[1], n[2])
    if (twiceArea === 0) continue
    total += twiceArea
    const onBed = Math.max(t.v1[2], t.v2[2], t.v3[2]) <= minZ + BED_TOLERANCE_MM
    if (!onBed && n[2] / twiceArea < OVERHANG_LIMIT) over += twiceArea
  }
  return total === 0 ? 0 : over / total
}

/** The six ways to stand a part on the bed, as proper rotations that put `axis` on +Z. */
const ORIENTATIONS: Array<{ axis: string; turn: (v: Vec) => Vec }> = [
  { axis: '+X', turn: ([x, y, z]) => [y, z, x] },
  { axis: '−X', turn: ([x, y, z]) => [z, y, -x] },
  { axis: '+Y', turn: ([x, y, z]) => [z, x, y] },
  { axis: '−Y', turn: ([x, y, z]) => [x, z, -y] },
  { axis: '−Z', turn: ([x, y, z]) => [x, -y, -z] },
]

/** Height of the part in a frame (its extent along Z). */
function heightOf(triangles: DfmTriangle[]): number {
  let lo = Infinity
  let hi = -Infinity
  for (const t of triangles) {
    for (const v of [t.v1, t.v2, t.v3]) {
      lo = Math.min(lo, v[2])
      hi = Math.max(hi, v[2])
    }
  }
  return hi - lo
}

/**
 * Another way to stand the part on the bed that clearly needs fewer supports, or null. It must cut the
 * overhang by at least a third and five points, and not make the part more than twice as tall (a tall
 * thin print is harder to keep on the bed).
 */
export function betterOrientation(
  triangles: DfmTriangle[],
  currentShare = overhangShare(triangles)
): { axis: string; share: number } | null {
  const currentHeight = heightOf(triangles)
  let best: { axis: string; share: number } | null = null
  for (const option of ORIENTATIONS) {
    const turned = triangles.map((t) => ({
      v1: option.turn(t.v1),
      v2: option.turn(t.v2),
      v3: option.turn(t.v3),
    }))
    const share = overhangShare(turned)
    if (heightOf(turned) > 2 * currentHeight) continue
    if (
      share < currentShare * (2 / 3) &&
      currentShare - share >= 0.05 &&
      (!best || share < best.share)
    ) {
      best = { axis: option.axis, share }
    }
  }
  return best
}

/** Connected components by shared vertices; fragments under 4 triangles count as debris. */
export function countBodies(triangles: DfmTriangle[]): { solid: number; stray: number } {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    let cur = x
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  const key = (v: Vec) => `${v[0].toFixed(3)},${v[1].toFixed(3)},${v[2].toFixed(3)}`
  const union = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a)
    if (!parent.has(b)) parent.set(b, b)
    parent.set(find(a), find(b))
  }

  for (const t of triangles) {
    const [a, b, c] = [key(t.v1), key(t.v2), key(t.v3)]
    union(a, b)
    union(b, c)
  }
  const sizes = new Map<string, number>()
  for (const t of triangles) {
    const root = find(key(t.v1))
    sizes.set(root, (sizes.get(root) ?? 0) + 1)
  }
  let solid = 0
  let stray = 0
  for (const count of sizes.values()) {
    if (count < 4) stray++
    else solid++
  }
  return { solid, stray }
}

export const hasBlocker = (issues: DfmIssue[]) => issues.some((i) => i.level === 'blocker')
