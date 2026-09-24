import { test } from '@japa/runner'
import { analyzeStl } from '#services/files/stl_analyzer'

/**
 * Generate a binary STL for a 20mm cube (8 vertices, 12 triangles).
 * Volume should be 8000 mm³.
 */
function makeCubeStl(): Buffer {
  const triangles: number[][] = [
    // Front face (z=20)
    [0, 0, 20, 20, 0, 20, 20, 20, 20],
    [0, 0, 20, 20, 20, 20, 0, 20, 20],
    // Back face (z=0)
    [20, 0, 0, 0, 0, 0, 0, 20, 0],
    [20, 0, 0, 0, 20, 0, 20, 20, 0],
    // Right face (x=20)
    [20, 0, 20, 20, 0, 0, 20, 20, 0],
    [20, 0, 20, 20, 20, 0, 20, 20, 20],
    // Left face (x=0)
    [0, 0, 0, 0, 0, 20, 0, 20, 20],
    [0, 0, 0, 0, 20, 20, 0, 20, 0],
    // Top face (y=20)
    [0, 20, 20, 20, 20, 20, 20, 20, 0],
    [0, 20, 20, 20, 20, 0, 0, 20, 0],
    // Bottom face (y=0)
    [0, 0, 0, 20, 0, 0, 20, 0, 20],
    [0, 0, 0, 20, 0, 20, 0, 0, 20],
  ]

  // Binary STL: 80 header + 4 count + 50 per triangle
  const buffer = Buffer.alloc(84 + triangles.length * 50)
  buffer.write('binary stl cube', 0, 'ascii')
  buffer.writeUInt32LE(triangles.length, 80)

  for (const [i, triangle] of triangles.entries()) {
    const offset = 84 + i * 50
    // Normal (0,0,0) — we don't compute normals for test
    buffer.writeFloatLE(0, offset)
    buffer.writeFloatLE(0, offset + 4)
    buffer.writeFloatLE(0, offset + 8)
    // 3 vertices (9 floats)
    for (let j = 0; j < 9; j++) {
      buffer.writeFloatLE(triangle[j], offset + 12 + j * 4)
    }
    // Attribute byte count
    buffer.writeUInt16LE(0, offset + 48)
  }

  return buffer
}

function makeAsciiCubeStl(): Buffer {
  const text = `solid cube
facet normal 0 0 1
  outer loop
    vertex 0 0 20
    vertex 20 0 20
    vertex 20 20 20
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 20
    vertex 20 20 20
    vertex 0 20 20
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex 20 0 0
    vertex 0 0 0
    vertex 0 20 0
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex 20 0 0
    vertex 0 20 0
    vertex 20 20 0
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 20 0 20
    vertex 20 0 0
    vertex 20 20 0
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 20 0 20
    vertex 20 20 0
    vertex 20 20 20
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 0 20
    vertex 0 20 20
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 20 20
    vertex 0 20 0
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 20 20
    vertex 20 20 20
    vertex 20 20 0
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 20 20
    vertex 20 20 0
    vertex 0 20 0
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 20 0 0
    vertex 20 0 20
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 20 0 20
    vertex 0 0 20
  endloop
endfacet
endsolid cube`
  return Buffer.from(text, 'utf-8')
}

test.group('StlAnalyzer', () => {
  test('binary cube volume within 1% of 8000 mm³', ({ assert }) => {
    const result = analyzeStl(makeCubeStl())
    assert.isNull(result.error)
    assert.equal(result.triangleCount, 12)
    assert.closeTo(result.volumeMm3, 8000, 80) // 1% tolerance
    assert.closeTo(result.bboxXMm, 20, 0.01)
    assert.closeTo(result.bboxYMm, 20, 0.01)
    assert.closeTo(result.bboxZMm, 20, 0.01)
    assert.isTrue(result.isPrintable)
  })

  test('ascii cube volume within 1% of 8000 mm³', ({ assert }) => {
    const result = analyzeStl(makeAsciiCubeStl())
    assert.isNull(result.error)
    assert.equal(result.triangleCount, 12)
    assert.closeTo(result.volumeMm3, 8000, 80)
    assert.isTrue(result.isPrintable)
  })

  test('too small buffer returns error', ({ assert }) => {
    const result = analyzeStl(Buffer.alloc(10))
    assert.isNotNull(result.error)
    assert.isFalse(result.isPrintable)
    assert.equal(result.triangleCount, 0)
  })

  test('empty triangles returns not printable', ({ assert }) => {
    // Valid header but 0 triangles
    const buffer = Buffer.alloc(84)
    buffer.writeUInt32LE(0, 80)
    const result = analyzeStl(buffer)
    assert.isFalse(result.isPrintable)
    assert.isNotNull(result.error)
  })
})

import {
  analyzeDfm,
  betterOrientation,
  countBodies,
  overhangShare,
  type DfmTriangle,
} from '#services/files/dfm_analyzer'

type Tri = [number, number, number][]
const tri = (a: Tri[number], b: Tri[number], c: Tri[number]): DfmTriangle => ({
  v1: a,
  v2: b,
  v3: c,
})

/** A closed box with outward normals, x/y/z from the origin. */
function box(
  x: number,
  y: number,
  z: number,
  at: [number, number, number] = [0, 0, 0]
): DfmTriangle[] {
  const [ox, oy, oz] = at
  const p = (a: number, b: number, c: number): [number, number, number] => [
    ox + a * x,
    oy + b * y,
    oz + c * z,
  ]
  const quad = (a: Tri[number], b: Tri[number], c: Tri[number], d: Tri[number]) => [
    tri(a, b, c),
    tri(a, c, d),
  ]
  return [
    ...quad(p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)), // bottom, normal -z
    ...quad(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)), // top, +z
    ...quad(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)), // -y
    ...quad(p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)), // +y
    ...quad(p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)), // -x
    ...quad(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)), // +x
  ]
}

test.group('DFM checks (R2-T10)', () => {
  test('a solid cube on the bed has no issues', ({ assert }) => {
    const cube = box(20, 20, 20)
    assert.deepEqual(analyzeDfm(cube, { signedVolume: 8000, bbox: [20, 20, 20] }), [])
    assert.equal(overhangShare(cube), 0, 'the underside rests on the bed')
  })

  test('paper-thin models are blocked, thin ones warned', ({ assert }) => {
    const sheet = analyzeDfm(box(50, 50, 0.2), { signedVolume: 500, bbox: [50, 50, 0.2] })
    assert.equal(sheet.find((i) => i.code === 'too_thin')?.level, 'blocker')
    const thin = analyzeDfm(box(50, 50, 0.7), { signedVolume: 1750, bbox: [50, 50, 0.7] })
    assert.equal(thin.find((i) => i.code === 'thin')?.level, 'warning')
  })

  test('a tiny model hints at a units mistake', ({ assert }) => {
    const issues = analyzeDfm(box(2, 2, 2), { signedVolume: 8, bbox: [2, 2, 2] })
    assert.include(
      issues.map((i) => i.code),
      'tiny'
    )
  })

  test('negative signed volume means inverted normals', ({ assert }) => {
    const issues = analyzeDfm(box(20, 20, 20), { signedVolume: -8000, bbox: [20, 20, 20] })
    assert.include(
      issues.map((i) => i.code),
      'inverted_normals'
    )
  })

  test('a T-shape has an overhang under the bar; a wide floating slab needs supports', ({
    assert,
  }) => {
    // stem 10x10x20 with a 40x10x5 bar on top: the bar's underside hangs in the air
    const stem = box(10, 10, 20, [15, 0, 0])
    const bar = box(40, 10, 5, [0, 0, 20])
    const share = overhangShare([...stem, ...bar])
    assert.isAbove(share, 0.1)
    const issues = analyzeDfm([...stem, ...bar], { signedVolume: 4000, bbox: [40, 10, 25] })
    assert.include(
      issues.map((i) => i.code),
      'overhang'
    )
  })

  test('a T-shape printed bar-up is told to stand the other way, with the real overhang numbers', ({
    assert,
  }) => {
    const shape = [...box(10, 10, 20, [15, 0, 0]), ...box(40, 10, 5, [0, 0, 20])]
    const best = betterOrientation(shape)
    assert.isNotNull(best)
    // flipped over, or lying on its flat side: both leave nothing hanging
    assert.include(['−Z', '+Y', '−Y'], best!.axis)
    assert.isBelow(best!.share, 0.02)

    const issues = analyzeDfm(shape, { signedVolume: 4000, bbox: [40, 10, 25] })
    const hint = issues.find((i) => i.code === 'better_orientation')
    assert.equal(hint?.level, 'info')
    assert.include(hint!.message, `${best!.axis} axis pointing up`)
    assert.match(hint!.message, /from about \d+% to \d+%/)
  })

  test('no advice when the current way is already fine, or nothing is clearly better', ({
    assert,
  }) => {
    assert.isNull(betterOrientation(box(20, 20, 20)))
    const cube = analyzeDfm(box(20, 20, 20), { signedVolume: 8000, bbox: [20, 20, 20] })
    assert.notInclude(
      cube.map((i) => i.code),
      'better_orientation'
    )
    // a part that is the same from every side has no better orientation to offer
    const cross = [
      ...box(30, 6, 6, [0, 12, 12]),
      ...box(6, 30, 6, [12, 0, 12]),
      ...box(6, 6, 30, [12, 12, 0]),
    ]
    const share = overhangShare(cross)
    const better = betterOrientation(cross, share)
    if (better) assert.isBelow(better.share, share * (2 / 3))
  })

  test('separate bodies are noted and stray fragments flagged', ({ assert }) => {
    const two = [...box(10, 10, 10), ...box(10, 10, 10, [30, 0, 0])]
    assert.deepEqual(countBodies(two), { solid: 2, stray: 0 })
    assert.include(
      analyzeDfm(two, { signedVolume: 2000, bbox: [40, 10, 10] }).map((i) => i.code),
      'multiple_bodies'
    )

    const debris = [...box(10, 10, 10), tri([50, 50, 0], [51, 50, 0], [50, 51, 0])]
    assert.deepEqual(countBodies(debris), { solid: 1, stray: 1 })
    assert.include(
      analyzeDfm(debris, { signedVolume: 1000, bbox: [51, 51, 10] }).map((i) => i.code),
      'floating_parts'
    )
  })
})
