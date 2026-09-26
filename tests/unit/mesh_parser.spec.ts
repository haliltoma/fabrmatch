import { test } from '@japa/runner'
import { crc32, deflateRawSync } from 'node:zlib'
import { analyzeTriangles } from '#services/files/stl_analyzer'
import { MeshParseError, parse3mf, parseObj } from '#services/files/mesh_parser'

/** A minimal zip writer (deflate), enough to build .3mf fixtures. */
function zip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [name, content] of Object.entries(files)) {
    const raw = Buffer.from(content, 'utf8')
    const data = deflateRawSync(raw)
    const nameBuf = Buffer.from(name, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc32(raw), 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc32(raw), 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBuf, data)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, eocd])
}

// a closed 10 mm cube: 8 vertices, 12 triangles (outward winding)
const CUBE_VERTS = [
  [0, 0, 0],
  [10, 0, 0],
  [10, 10, 0],
  [0, 10, 0],
  [0, 0, 10],
  [10, 0, 10],
  [10, 10, 10],
  [0, 10, 10],
]
const CUBE_TRIS = [
  [0, 2, 1],
  [0, 3, 2],
  [4, 5, 6],
  [4, 6, 7],
  [0, 1, 5],
  [0, 5, 4],
  [2, 3, 7],
  [2, 7, 6],
  [1, 2, 6],
  [1, 6, 5],
  [3, 0, 4],
  [3, 4, 7],
]

function cubeModelXml(unit = 'millimeter', buildTransform?: string) {
  const vertices = CUBE_VERTS.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('')
  const triangles = CUBE_TRIS.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join(
    ''
  )
  const transform = buildTransform ? ` transform="${buildTransform}"` : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="${unit}" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>
    <object id="2" type="model"><components><component objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0"/></components></object>
  </resources>
  <build><item objectid="1"${transform}/></build>
</model>`
}

test.group('mesh parser: 3MF', () => {
  test('reads a cube: volume, size and watertightness match the STL analysis', ({ assert }) => {
    const triangles = parse3mf(zip({ '3D/3dmodel.model': cubeModelXml() }))
    const result = analyzeTriangles(triangles)
    assert.lengthOf(triangles, 12)
    assert.closeTo(result.volumeMm3, 1000, 1e-6)
    assert.deepEqual([result.bboxXMm, result.bboxYMm, result.bboxZMm], [10, 10, 10])
    assert.isTrue(result.isPrintable)
  })

  test('applies the model unit and the build transform', ({ assert }) => {
    const inches = analyzeTriangles(parse3mf(zip({ '3D/3dmodel.model': cubeModelXml('inch') })))
    assert.closeTo(inches.bboxXMm, 254, 1e-6)

    const scaled = analyzeTriangles(
      parse3mf(zip({ '3D/3dmodel.model': cubeModelXml('millimeter', '2 0 0 0 1 0 0 0 1 5 0 0') }))
    )
    assert.closeTo(scaled.bboxXMm, 20, 1e-6)
    assert.closeTo(scaled.volumeMm3, 2000, 1e-6)
  })

  test('follows components', ({ assert }) => {
    const xml = cubeModelXml().replace('<item objectid="1"/>', '<item objectid="2"/>')
    const triangles = parse3mf(zip({ '3D/3dmodel.model': xml }))
    assert.lengthOf(triangles, 12)
    assert.equal(Math.min(...triangles.map((t) => t.v1[0])), 20)
  })

  test('a zip without a model or with a broken reference is a clear error', ({ assert }) => {
    assert.throws(() => parse3mf(zip({ 'readme.txt': 'hi' })), MeshParseError)
    const broken = cubeModelXml().replace('<item objectid="1"/>', '<item objectid="9"/>')
    assert.throws(() => parse3mf(zip({ '3D/3dmodel.model': broken })), /missing object/)
  })
})

test.group('mesh parser: OBJ', () => {
  test('reads quads and triangles, 1-based and negative indices', ({ assert }) => {
    const obj = [
      '# cube',
      ...CUBE_VERTS.map(([x, y, z]) => `v ${x} ${y} ${z}`),
      // bottom and top as quads, the rest as triangles with texture/normal refs
      'f 1 4 3 2',
      'f 5/1/1 6/1/1 7/1/1 8/1/1',
      ...CUBE_TRIS.slice(4).map(([a, b, c]) => `f ${a - 8} ${b - 8} ${c - 8}`),
    ].join('\n')
    const triangles = parseObj(obj)
    assert.lengthOf(triangles, 12)
    const result = analyzeTriangles(triangles)
    assert.closeTo(result.volumeMm3, 1000, 1e-6)
    assert.isTrue(result.isPrintable)
  })

  test('a face pointing at a missing vertex is an error', ({ assert }) => {
    assert.throws(() => parseObj('v 0 0 0\nf 1 2 3\n'), MeshParseError)
  })
})
