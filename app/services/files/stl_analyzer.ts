/**
 * Lightweight STL parser for volume, bbox, triangle count, and manifold check.
 * Supports binary and ASCII STL formats.
 * No external dependencies.
 */

import { analyzeDfm, hasBlocker, type DfmIssue } from '#services/files/dfm_analyzer'

export interface StlAnalysisResult {
  dfmIssues: DfmIssue[]
  volumeMm3: number
  bboxXMm: number
  bboxYMm: number
  bboxZMm: number
  triangleCount: number
  isPrintable: boolean
  error: string | null
}

export interface Triangle {
  v1: [number, number, number]
  v2: [number, number, number]
  v3: [number, number, number]
}

function isBinaryStl(buffer: Buffer): boolean {
  // Binary STL: 80-byte header + 4-byte triangle count + 50 bytes per triangle
  if (buffer.length < 84) return false

  const triangleCount = buffer.readUInt32LE(80)
  const expectedSize = 84 + triangleCount * 50

  // If size matches binary format, it's binary
  // Also check that it doesn't start with "solid" followed by valid ASCII content
  if (Math.abs(buffer.length - expectedSize) <= 1) return true

  // Check for ASCII signature
  const header = buffer.subarray(0, 80).toString('ascii')
  if (header.trimStart().startsWith('solid')) {
    // Could be ASCII — check for "facet" keyword in first few KB
    const sample = buffer.subarray(0, Math.min(1024, buffer.length)).toString('ascii')
    if (sample.includes('facet')) return false
  }

  return true
}

function parseBinaryStl(buffer: Buffer): Triangle[] {
  const triangleCount = buffer.readUInt32LE(80)
  const triangles: Triangle[] = []

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50
    // Skip normal (12 bytes), read 3 vertices (each 12 bytes = 3 floats)
    const v1: [number, number, number] = [
      buffer.readFloatLE(offset + 12),
      buffer.readFloatLE(offset + 16),
      buffer.readFloatLE(offset + 20),
    ]
    const v2: [number, number, number] = [
      buffer.readFloatLE(offset + 24),
      buffer.readFloatLE(offset + 28),
      buffer.readFloatLE(offset + 32),
    ]
    const v3: [number, number, number] = [
      buffer.readFloatLE(offset + 36),
      buffer.readFloatLE(offset + 40),
      buffer.readFloatLE(offset + 44),
    ]
    triangles.push({ v1, v2, v3 })
  }

  return triangles
}

function parseAsciiStl(text: string): Triangle[] {
  const triangles: Triangle[] = []
  const vertexRegex =
    /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g

  const vertices: [number, number, number][] = []
  let match: RegExpExecArray | null
  while ((match = vertexRegex.exec(text)) !== null) {
    vertices.push([
      Number.parseFloat(match[1]),
      Number.parseFloat(match[2]),
      Number.parseFloat(match[3]),
    ])
  }

  for (let i = 0; i + 2 < vertices.length; i += 3) {
    triangles.push({ v1: vertices[i], v2: vertices[i + 1], v3: vertices[i + 2] })
  }

  return triangles
}

/** Triangles of a binary or ASCII STL (the renderer reads them too). */
export function parseStl(buffer: Buffer): Triangle[] {
  if (buffer.length < 84) return []
  return isBinaryStl(buffer) ? parseBinaryStl(buffer) : parseAsciiStl(buffer.toString('utf-8'))
}

/**
 * Signed volume of a triangle with respect to origin.
 * V = (v1 . (v2 x v3)) / 6
 */
function signedVolumeOfTriangle(t: Triangle): number {
  const [x1, y1, z1] = t.v1
  const [x2, y2, z2] = t.v2
  const [x3, y3, z3] = t.v3

  return (x1 * (y2 * z3 - y3 * z2) + x2 * (y3 * z1 - y1 * z3) + x3 * (y1 * z2 - y2 * z1)) / 6.0
}

/**
 * Simple manifold check: each edge should appear exactly twice (once in each direction).
 * For large meshes, sample first N triangles.
 */
function isManifold(triangles: Triangle[]): boolean {
  // For very large meshes, sample to keep memory reasonable
  const sample = triangles.length > 50000 ? triangles.slice(0, 50000) : triangles
  const edgeCount = new Map<string, number>()

  function edgeKey(a: [number, number, number], b: [number, number, number]): string {
    return `${a[0].toFixed(6)},${a[1].toFixed(6)},${a[2].toFixed(6)}|${b[0].toFixed(6)},${b[1].toFixed(6)},${b[2].toFixed(6)}`
  }

  for (const t of sample) {
    const edges: [[number, number, number], [number, number, number]][] = [
      [t.v1, t.v2],
      [t.v2, t.v3],
      [t.v3, t.v1],
    ]
    for (const [a, b] of edges) {
      const key = edgeKey(a, b)
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1)
    }
  }

  // Each directed edge should have a reverse. Count unpaired edges.
  let unpaired = 0
  for (const [key, count] of edgeCount) {
    // '|' and not '-': coordinates can be negative, and '-' would split inside a number
    const [a, b] = key.split('|')
    const reverseKey = `${b}|${a}`
    const reverseCount = edgeCount.get(reverseKey) || 0
    if (count !== reverseCount) unpaired++
  }

  // Allow small tolerance for near-manifold meshes
  return unpaired <= sample.length * 0.01
}

export function analyzeStl(buffer: Buffer): StlAnalysisResult {
  try {
    if (buffer.length < 84) {
      return {
        volumeMm3: 0,
        bboxXMm: 0,
        bboxYMm: 0,
        bboxZMm: 0,
        triangleCount: 0,
        isPrintable: false,
        dfmIssues: [],
        error: 'File too small to be a valid STL',
      }
    }

    const binary = isBinaryStl(buffer)
    const triangles = binary ? parseBinaryStl(buffer) : parseAsciiStl(buffer.toString('utf-8'))

    if (triangles.length === 0) {
      return {
        volumeMm3: 0,
        bboxXMm: 0,
        bboxYMm: 0,
        bboxZMm: 0,
        triangleCount: 0,
        isPrintable: false,
        dfmIssues: [],
        error: 'No triangles found in STL file',
      }
    }

    return analyzeTriangles(triangles)
  } catch (err) {
    return {
      volumeMm3: 0,
      bboxXMm: 0,
      bboxYMm: 0,
      bboxZMm: 0,
      triangleCount: 0,
      isPrintable: false,
      dfmIssues: [],
      error: `Analysis failed: ${(err as Error).message}`,
    }
  }
}

/**
 * Volume, bounding box, watertightness and DFM checks from triangles, whatever format they came
 * from (STL, 3MF, OBJ). Millimetres in, millimetres out.
 */
export function analyzeTriangles(triangles: Triangle[]): StlAnalysisResult {
  if (triangles.length === 0) {
    return {
      volumeMm3: 0,
      bboxXMm: 0,
      bboxYMm: 0,
      bboxZMm: 0,
      triangleCount: 0,
      isPrintable: false,
      dfmIssues: [],
      error: 'No triangles found in the model',
    }
  }
  // Volume (absolute value of sum of signed volumes)
  let volume = 0
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const t of triangles) {
    volume += signedVolumeOfTriangle(t)
    for (const v of [t.v1, t.v2, t.v3]) {
      if (v[0] < minX) minX = v[0]
      if (v[1] < minY) minY = v[1]
      if (v[2] < minZ) minZ = v[2]
      if (v[0] > maxX) maxX = v[0]
      if (v[1] > maxY) maxY = v[1]
      if (v[2] > maxZ) maxZ = v[2]
    }
  }

  const volumeMm3 = Math.abs(volume)
  const bboxXMm = maxX - minX
  const bboxYMm = maxY - minY
  const bboxZMm = maxZ - minZ

  const manifold = isManifold(triangles)
  const hasVolume = volumeMm3 > 0.001
  const dfmIssues = analyzeDfm(triangles, {
    signedVolume: volume,
    bbox: [bboxXMm, bboxYMm, bboxZMm],
  })
  if (!manifold) {
    dfmIssues.unshift({
      code: 'not_watertight',
      level: 'blocker',
      message: 'The mesh has holes or open edges (not watertight). Repair it and upload again.',
    })
  }

  return {
    volumeMm3,
    bboxXMm,
    bboxYMm,
    bboxZMm,
    triangleCount: triangles.length,
    isPrintable: manifold && hasVolume && !hasBlocker(dfmIssues),
    dfmIssues,
    error: null,
  }
}
