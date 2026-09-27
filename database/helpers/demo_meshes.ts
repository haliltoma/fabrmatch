/**
 * Small procedural STL meshes for the demo shop (dev only), so every demo product has a real
 * model file to analyse and render. Shapes are unions of boxes and frustums: overlapping solids
 * are fine for a render and for a rough volume.
 */

type V = [number, number, number]
type Tri = [V, V, V]

function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Tri[] {
  const p = (x: number, y: number, z: number): V => [x, y, z]
  const c = [
    p(x0, y0, z0),
    p(x1, y0, z0),
    p(x1, y1, z0),
    p(x0, y1, z0),
    p(x0, y0, z1),
    p(x1, y0, z1),
    p(x1, y1, z1),
    p(x0, y1, z1),
  ]
  const f = (a: number, b: number, cc: number, d: number): Tri[] => [
    [c[a], c[b], c[cc]],
    [c[a], c[cc], c[d]],
  ]
  return [
    ...f(0, 3, 2, 1),
    ...f(4, 5, 6, 7),
    ...f(0, 1, 5, 4),
    ...f(2, 3, 7, 6),
    ...f(1, 2, 6, 5),
    ...f(3, 0, 4, 7),
  ]
}

/** A closed frustum (cylinder when r0 = r1) around (cx, cy). */
function frustum(cx: number, cy: number, r0: number, r1: number, z0: number, z1: number, seg = 48) {
  const tris: Tri[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    const b = ((i + 1) / seg) * Math.PI * 2
    const lo = (r: number, t: number, z: number): V => [
      cx + r * Math.cos(t),
      cy + r * Math.sin(t),
      z,
    ]
    const p0 = lo(r0, a, z0)
    const p1 = lo(r0, b, z0)
    const q0 = lo(r1, a, z1)
    const q1 = lo(r1, b, z1)
    tris.push([p0, p1, q1], [p0, q1, q0])
    tris.push([[cx, cy, z0], p1, p0], [[cx, cy, z1], q0, q1])
  }
  return tris
}

const SHAPES: Record<string, () => Tri[]> = {
  'Desk Organizer': () => {
    const t = 3
    return [
      ...box(0, 0, 0, 90, 70, t),
      ...box(0, 0, 0, t, 70, 45),
      ...box(90 - t, 0, 0, 90, 70, 45),
      ...box(0, 0, 0, 90, t, 30),
      ...box(0, 70 - t, 0, 90, 70, 45),
      ...box(35, 0, 0, 35 + t, 70, 38),
      ...box(35, 35, 0, 90, 35 + t, 30),
    ]
  },
  'Planter Pot': () => [
    ...frustum(0, 0, 38, 50, 0, 88),
    ...frustum(0, 0, 53, 53, 80, 96),
    ...frustum(0, 0, 44, 44, 96, 98),
  ],
  'Headphone Stand': () => [
    ...frustum(0, 0, 45, 42, 0, 9),
    ...box(-7, -7, 9, 7, 7, 210),
    ...box(-7, -12, 200, 7, 60, 212),
    ...box(-7, 52, 212, 7, 60, 222),
  ],
  'Cable Clip Set': () =>
    [0, 22, 44].flatMap((x) => [
      ...box(x, 0, 0, x + 16, 3, 20),
      ...box(x, 0, 0, x + 16, 14, 3),
      ...box(x, 0, 17, x + 16, 12, 20),
      ...box(x, 11, 12, x + 16, 14, 20),
    ]),
}

export function demoMeshFor(title: string): Buffer | null {
  const make = SHAPES[title]
  return make ? toBinaryStl(make()) : null
}

function toBinaryStl(tris: Tri[]): Buffer {
  const buf = Buffer.alloc(84 + tris.length * 50)
  buf.write('fabrmatch demo mesh', 0, 'ascii')
  buf.writeUInt32LE(tris.length, 80)
  tris.forEach((t, i) => {
    const o = 84 + i * 50
    t.forEach((v, j) => v.forEach((c, k) => buf.writeFloatLE(c, o + 12 + j * 12 + k * 4)))
  })
  return buf
}
