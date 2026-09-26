import { inflateRawSync } from 'node:zlib'
import { parseStl, type Triangle } from '#services/files/stl_analyzer'
import type { ModelFormat } from '#services/files/file_scanner'

/**
 * Triangles in millimetres from any accepted upload format, with no external dependency:
 * STL (binary/ASCII), OBJ (text) and 3MF (zip + XML, core spec with components, transforms and
 * units). The upload was already scanned (`file_scanner`), so the zip's paths and sizes are sane.
 */

const MAX_TRIANGLES = 5_000_000
const MAX_MODEL_XML_BYTES = 400 * 1024 * 1024

export class MeshParseError extends Error {}

export function parseModel(buffer: Buffer, format: ModelFormat): Triangle[] {
  if (format === 'STL') return parseStl(buffer)
  if (format === 'OBJ') return parseObj(buffer.toString('latin1'))
  return parse3mf(buffer)
}

// ---------------------------------------------------------------- OBJ

export function parseObj(text: string): Triangle[] {
  const vertices: [number, number, number][] = []
  const triangles: Triangle[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/)
      vertices.push([Number(x), Number(y), Number(z)])
    } else if (line.startsWith('f ')) {
      const idx = line
        .split(/\s+/)
        .slice(1)
        .map((token) => {
          const n = Number.parseInt(token.split('/')[0], 10)
          // OBJ indices are 1-based; negative ones count back from the latest vertex
          return n < 0 ? vertices.length + n : n - 1
        })
      if (idx.some((i) => Number.isNaN(i) || i < 0 || i >= vertices.length)) {
        throw new MeshParseError('The OBJ refers to a vertex that does not exist')
      }
      // fan-triangulate polygons
      for (let k = 1; k + 1 < idx.length; k++) {
        triangles.push({ v1: vertices[idx[0]], v2: vertices[idx[k]], v3: vertices[idx[k + 1]] })
      }
      if (triangles.length > MAX_TRIANGLES) throw new MeshParseError('The model is too detailed')
    }
  }
  return triangles
}

// ---------------------------------------------------------------- 3MF

const UNIT_SCALE: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
}

type Matrix = number[] // 12 numbers, 3MF row-major: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
const IDENTITY: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]

function parseMatrix(value: string | undefined): Matrix {
  if (!value) return IDENTITY
  const m = value.trim().split(/\s+/).map(Number)
  return m.length === 12 && m.every(Number.isFinite) ? m : IDENTITY
}

/** Applies `inner` first, then `outer` (3MF: component transform, then build item transform). */
function compose(inner: Matrix, outer: Matrix): Matrix {
  const r: Matrix = new Array(12).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      let sum = row === 3 ? outer[9 + col] : 0
      for (let k = 0; k < 3; k++) sum += inner[row * 3 + k] * outer[k * 3 + col]
      r[row * 3 + col] = sum
    }
  }
  return r
}

function apply(m: Matrix, v: [number, number, number], scale: number): [number, number, number] {
  const [x, y, z] = v
  return [
    (x * m[0] + y * m[3] + z * m[6] + m[9]) * scale,
    (x * m[1] + y * m[4] + z * m[7] + m[10]) * scale,
    (x * m[2] + y * m[5] + z * m[8] + m[11]) * scale,
  ]
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2]
  return out
}

interface ModelObject {
  vertices: [number, number, number][]
  triangles: [number, number, number][]
  components: Array<{ objectId: string; path: string | null; transform: Matrix }>
}

interface ModelDoc {
  scale: number
  objects: Map<string, ModelObject>
  items: Array<{ objectId: string; path: string | null; transform: Matrix }>
}

function parseModelXml(xml: string): ModelDoc {
  const unit = /<model\b[^>]*\bunit="([^"]+)"/.exec(xml)?.[1] ?? 'millimeter'
  const objects = new Map<string, ModelObject>()
  for (const match of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const id = attrs(match[1]).id
    const body = match[2]
    const vertices: [number, number, number][] = []
    for (const v of body.matchAll(/<vertex\b([^>]*)\/?>/g)) {
      const a = attrs(v[1])
      vertices.push([Number(a.x), Number(a.y), Number(a.z)])
    }
    const triangles: [number, number, number][] = []
    for (const t of body.matchAll(/<triangle\b([^>]*)\/?>/g)) {
      const a = attrs(t[1])
      triangles.push([Number(a.v1), Number(a.v2), Number(a.v3)])
    }
    const components = [...body.matchAll(/<component\b([^>]*)\/?>/g)].map((c) => {
      const a = attrs(c[1])
      return {
        objectId: a.objectid,
        path: a['p:path'] ?? null,
        transform: parseMatrix(a.transform),
      }
    })
    if (id) objects.set(id, { vertices, triangles, components })
  }
  const build = /<build\b[^>]*>([\s\S]*?)<\/build>/.exec(xml)?.[1] ?? ''
  const items = [...build.matchAll(/<item\b([^>]*)\/?>/g)].map((m) => {
    const a = attrs(m[1])
    return { objectId: a.objectid, path: a['p:path'] ?? null, transform: parseMatrix(a.transform) }
  })
  return { scale: UNIT_SCALE[unit] ?? 1, objects, items }
}

export function parse3mf(buffer: Buffer): Triangle[] {
  const entries = readZip(buffer)
  const modelPaths = [...entries.keys()].filter((p) => /\.model$/i.test(p))
  const main =
    modelPaths.find((p) => p.toLowerCase() === '3d/3dmodel.model') ??
    modelPaths.find((p) => p.toLowerCase().startsWith('3d/'))
  if (!main) throw new MeshParseError('The .3mf file has no 3D model inside')

  const docs = new Map<string, ModelDoc>()
  const doc = (path: string) => {
    const key = path.replace(/^\//, '')
    if (!docs.has(key)) {
      const entry = entries.get(key)
      if (!entry) throw new MeshParseError(`The .3mf refers to a missing part (${key})`)
      docs.set(key, parseModelXml(entry().toString('utf8')))
    }
    return docs.get(key)!
  }

  const mainDoc = doc(main)
  const triangles: Triangle[] = []
  const emit = (path: string, objectId: string, transform: Matrix, depth: number) => {
    if (depth > 16) throw new MeshParseError('The .3mf components are nested too deeply')
    const d = doc(path)
    const object = d.objects.get(objectId)
    if (!object) throw new MeshParseError(`The .3mf refers to a missing object (${objectId})`)
    for (const [a, b, c] of object.triangles) {
      const va = object.vertices[a]
      const vb = object.vertices[b]
      const vc = object.vertices[c]
      if (!va || !vb || !vc) throw new MeshParseError('The .3mf mesh refers to a missing vertex')
      triangles.push({
        v1: apply(transform, va, mainDoc.scale),
        v2: apply(transform, vb, mainDoc.scale),
        v3: apply(transform, vc, mainDoc.scale),
      })
      if (triangles.length > MAX_TRIANGLES) throw new MeshParseError('The model is too detailed')
    }
    for (const comp of object.components) {
      emit(comp.path ?? path, comp.objectId, compose(comp.transform, transform), depth + 1)
    }
  }

  // no build items → every object that is a mesh, placed as-is
  const items =
    mainDoc.items.length > 0
      ? mainDoc.items
      : [...mainDoc.objects.entries()]
          .filter(([, o]) => o.triangles.length > 0)
          .map(([id]) => ({ objectId: id, path: null, transform: IDENTITY }))
  for (const item of items) emit(item.path ?? main, item.objectId, item.transform, 0)
  return triangles
}

/** Lazily decompresses zip entries (stored or deflate), read from the central directory. */
function readZip(buffer: Buffer): Map<string, () => Buffer> {
  let eocd = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new MeshParseError('The .3mf archive is damaged')
  const count = buffer.readUInt16LE(eocd + 10)
  let offset = buffer.readUInt32LE(eocd + 16)
  const entries = new Map<string, () => Buffer>()
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new MeshParseError('The .3mf archive is damaged')
    }
    const method = buffer.readUInt16LE(offset + 10)
    const packed = buffer.readUInt32LE(offset + 20)
    const size = buffer.readUInt32LE(offset + 24)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extra = buffer.readUInt16LE(offset + 30)
    const comment = buffer.readUInt16LE(offset + 32)
    const local = buffer.readUInt32LE(offset + 42)
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    entries.set(name, () => {
      if (size > MAX_MODEL_XML_BYTES) throw new MeshParseError('The .3mf model is too large')
      const dataStart =
        local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
      const data = buffer.subarray(dataStart, dataStart + packed)
      if (method === 0) return Buffer.from(data)
      if (method === 8) return inflateRawSync(data, { maxOutputLength: MAX_MODEL_XML_BYTES })
      throw new MeshParseError('The .3mf uses an unsupported compression')
    })
    offset += 46 + nameLength + extra + comment
  }
  return entries
}
