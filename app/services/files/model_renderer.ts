import { crc32, deflateSync } from 'node:zlib'
import type { Triangle } from '#services/files/stl_analyzer'

/**
 * Server-side turntable renders of a model for the shop (R4-T6), no native dependencies: an
 * orthographic z-buffer rasterizer with two lights, layer lines on the side walls (the "freshly
 * printed" look of DESIGN.md) and a soft contact shadow, on a transparent background so the same
 * picture works on the light and the dark theme. Only pixels leave the server, never the mesh
 * (business rule 4: the model file itself is shared through file access grants only).
 */

export const RENDER_VERSION = 1

export interface RenderOptions {
  /** output edge in pixels (square) */
  size?: number
  /** turntable angles in degrees */
  angles?: number[]
  /** filament colour as [r, g, b] 0–255 */
  color?: [number, number, number]
  /** supersampling factor per axis (anti-aliasing) */
  supersample?: number
}

export interface RenderedFrame {
  angle: number
  width: number
  height: number
  png: Buffer
}

export const DEFAULT_ANGLES = [30, 75, 120, 165, 210, 255, 300, 345]
const ELEVATION = (25 * Math.PI) / 180
// grey PLA: reads as "a printed part" without implying a colour the buyer did not pick
const DEFAULT_COLOR: [number, number, number] = [184, 189, 195]

type V3 = [number, number, number]

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const normalize = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// lights are fixed to the camera, so the turntable shows the form from every side
const KEY = normalize([-0.8, 0.5, 0.6])
const FILL = normalize([0.7, 0.15, 0.7])

export function renderTurntable(triangles: Triangle[], options: RenderOptions = {}) {
  const size = options.size ?? 720
  const ss = options.supersample ?? 2
  const angles = options.angles ?? DEFAULT_ANGLES
  const color = options.color ?? DEFAULT_COLOR
  if (triangles.length === 0) return []

  // centre on x/y, stand the part on the ground (z = 0)
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (const t of triangles) {
    for (const v of [t.v1, t.v2, t.v3]) {
      if (v[0] < minX) minX = v[0]
      if (v[1] < minY) minY = v[1]
      if (v[2] < minZ) minZ = v[2]
      if (v[0] > maxX) maxX = v[0]
      if (v[1] > maxY) maxY = v[1]
      if (v[2] > maxZ) maxZ = v[2]
    }
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const height = maxZ - minZ
  // one scale for every angle (bounding sphere), so the turntable does not "breathe"
  const radius = Math.hypot(maxX - minX, maxY - minY, height) / 2 || 1
  const layer = Math.max(0.2, height / 90)

  return angles.map((angle) =>
    renderFrame(triangles, {
      size,
      ss,
      angle,
      color,
      cx,
      cy,
      minZ,
      height,
      radius,
      layer,
      footprint: Math.max(maxX - minX, maxY - minY) / 2,
    })
  )
}

function renderFrame(
  triangles: Triangle[],
  f: {
    size: number
    ss: number
    angle: number
    color: [number, number, number]
    cx: number
    cy: number
    minZ: number
    height: number
    radius: number
    layer: number
    footprint: number
  }
): RenderedFrame {
  const W = f.size * f.ss
  const H = W
  const scale = (W * 0.42) / f.radius
  const theta = (f.angle * Math.PI) / 180
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  const sinE = Math.sin(ELEVATION)
  const cosE = Math.cos(ELEVATION)
  // screen centre: the middle of the part's height sits at the image centre
  const midZ = f.height / 2

  // camera basis in world space: right = x, up = (0, sinE, cosE), towards the scene = (0, cosE, -sinE)
  const project = (v: V3) => {
    const x = v[0] - f.cx
    const y = v[1] - f.cy
    const z = v[2] - f.minZ
    const rx = x * cosT - y * sinT
    const ry = x * sinT + y * cosT
    const sx = rx
    const sy = ry * sinE + (z - midZ) * cosE
    const depth = ry * cosE - (z - midZ) * sinE
    return { px: W / 2 + sx * scale, py: H / 2 - sy * scale, depth, z, rot: [rx, ry, z] as V3 }
  }

  const rgba = new Float32Array(W * H * 4)
  const zbuf = new Float32Array(W * H).fill(Infinity)

  // soft contact shadow: an ellipse on the ground under the part
  const ground = project([f.cx, f.cy, f.minZ])
  const rx = f.footprint * 1.15 * scale
  const ry = rx * sinE
  for (let y = Math.max(0, Math.floor(ground.py - ry)); y < Math.min(H, ground.py + ry); y++) {
    for (let x = Math.max(0, Math.floor(ground.px - rx)); x < Math.min(W, ground.px + rx); x++) {
      const d = ((x - ground.px) / rx) ** 2 + ((y - ground.py) / ry) ** 2
      if (d >= 1) continue
      const a = 0.22 * (1 - d) ** 2
      const i = (y * W + x) * 4
      rgba[i + 3] = a // black, premultiplied rgb stays 0
    }
  }

  const toView = (n: V3): V3 => [n[0], n[1] * sinE + n[2] * cosE, -(n[1] * cosE - n[2] * sinE)]

  for (const t of triangles) {
    const a = project(t.v1)
    const b = project(t.v2)
    const c = project(t.v3)
    const area = (b.px - a.px) * (c.py - a.py) - (b.py - a.py) * (c.px - a.px)
    if (Math.abs(area) < 1e-9) continue

    // normal from the rotated geometry, turned to face the camera (two-sided, forgives bad winding)
    let n = normalize(cross(sub(b.rot, a.rot), sub(c.rot, a.rot)))
    let view = toView(n)
    if (view[2] < 0) {
      n = [-n[0], -n[1], -n[2]]
      view = [-view[0], -view[1], -view[2]]
    }
    const key = Math.max(0, dot(view, KEY))
    const lambert = 0.36 + 0.62 * key + 0.3 * Math.max(0, dot(view, FILL))
    // a soft highlight and a rim light keep matte filament from looking flat
    const half = normalize([KEY[0], KEY[1], KEY[2] + 1])
    const spec = 0.18 * Math.max(0, dot(view, half)) ** 24
    const rim = 0.1 * (1 - Math.max(0, view[2])) ** 2
    const shade = Math.min(1.2, lambert + spec + rim)
    // layer lines only show on walls, not on flat tops and bottoms
    const wall = Math.abs(n[2]) < 0.85

    const minPx = Math.max(0, Math.floor(Math.min(a.px, b.px, c.px)))
    const maxPx = Math.min(W - 1, Math.ceil(Math.max(a.px, b.px, c.px)))
    const minPy = Math.max(0, Math.floor(Math.min(a.py, b.py, c.py)))
    const maxPy = Math.min(H - 1, Math.ceil(Math.max(a.py, b.py, c.py)))
    const inv = 1 / area

    for (let y = minPy; y <= maxPy; y++) {
      const py = y + 0.5
      for (let x = minPx; x <= maxPx; x++) {
        const px = x + 0.5
        const w0 = ((b.px - px) * (c.py - py) - (b.py - py) * (c.px - px)) * inv
        const w1 = ((c.px - px) * (a.py - py) - (c.py - py) * (a.px - px)) * inv
        const w2 = 1 - w0 - w1
        if (w0 < 0 || w1 < 0 || w2 < 0) continue
        const depth = w0 * a.depth + w1 * b.depth + w2 * c.depth
        const idx = y * W + x
        if (depth >= zbuf[idx]) continue
        zbuf[idx] = depth

        let s = shade
        if (wall) {
          const z = w0 * a.z + w1 * b.z + w2 * c.z
          const phase = (z / f.layer) % 1
          s *= phase < 0.18 ? 0.9 : 1
        }
        const i = idx * 4
        rgba[i] = Math.min(255, f.color[0] * s)
        rgba[i + 1] = Math.min(255, f.color[1] * s)
        rgba[i + 2] = Math.min(255, f.color[2] * s)
        rgba[i + 3] = 1
      }
    }
  }

  return {
    angle: f.angle,
    width: f.size,
    height: f.size,
    png: encodePng(downsample(rgba, W, H, f.ss), f.size, f.size),
  }
}

/** Box-filter the supersampled image; colour is weighted by coverage so edges blend cleanly. */
function downsample(src: Float32Array, W: number, H: number, ss: number): Uint8Array {
  const w = W / ss
  const h = H / ss
  const out = new Uint8Array(w * h * 4)
  const n = ss * ss
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = ((y * ss + dy) * W + (x * ss + dx)) * 4
          const al = src[i + 3]
          r += src[i] * al
          g += src[i + 1] * al
          b += src[i + 2] * al
          a += al
        }
      }
      const o = (y * w + x) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round((a / n) * 255)
    }
  }
  return out
}

/** Minimal RGBA PNG (8-bit, no filtering). */
export function encodePng(rgba: Uint8Array, width: number, height: number): Buffer {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
