import { test } from '@japa/runner'
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import app from '@adonisjs/core/services/app'
import { parseStl, type Triangle } from '#services/files/stl_analyzer'
import { renderTurntable } from '#services/files/model_renderer'

const SHOTS = process.env.SHOTS_DIR

/** Decodes the RGBA PNGs the renderer writes (filter type 0 only). */
function decode(png: Buffer) {
  let offset = 8
  const idat: Buffer[] = []
  let width = 0
  let height = 0
  while (offset < png.length) {
    const len = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
    }
    if (type === 'IDAT') idat.push(data)
    offset += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const alphaAt = (x: number, y: number) => raw[y * (width * 4 + 1) + 1 + x * 4 + 3]
  return { width, height, alphaAt }
}

function cube(size: number): Triangle[] {
  const v = (x: number, y: number, z: number): [number, number, number] => [
    x * size,
    y * size,
    z * size,
  ]
  const quads = [
    [v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0)],
    [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)],
    [v(0, 1, 0), v(1, 1, 0), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(0, 1, 0), v(0, 1, 1), v(0, 0, 1)],
    [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)],
  ]
  return quads.flatMap(([a, b, c, d]) => [
    { v1: a, v2: b, v3: c },
    { v1: a, v2: c, v3: d },
  ])
}

test.group('model renderer', () => {
  test('renders one transparent PNG per angle with the part in the middle', ({ assert }) => {
    const frames = renderTurntable(cube(20), { size: 200, angles: [0, 90] })
    assert.lengthOf(frames, 2)
    for (const f of frames) {
      assert.deepEqual([...f.png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47])
      const img = decode(f.png)
      assert.equal(img.width, 200)
      assert.equal(img.height, 200)
      assert.equal(img.alphaAt(100, 100), 255, 'the part covers the centre')
      assert.equal(img.alphaAt(2, 2), 0, 'the background is transparent')
    }
  })

  test('the same part is framed the same way at every angle (no "breathing")', ({ assert }) => {
    const tall: Triangle[] = cube(10).map((t) => ({
      v1: [t.v1[0], t.v1[1], t.v1[2] * 4],
      v2: [t.v2[0], t.v2[1], t.v2[2] * 4],
      v3: [t.v3[0], t.v3[1], t.v3[2] * 4],
    }))
    const [a, b] = renderTurntable(tall, { size: 160, angles: [0, 45] }).map((f) => decode(f.png))
    const top = (img: ReturnType<typeof decode>) => {
      for (let y = 0; y < 160; y++) if (img.alphaAt(80, y) === 255) return y
      return -1
    }
    assert.isAtMost(Math.abs(top(a) - top(b)), 4)
  })

  test('an empty mesh renders nothing', ({ assert }) => {
    assert.deepEqual(renderTurntable([]), [])
  })

  test('renders the sample vase', ({ assert }) => {
    const triangles = parseStl(readFileSync(app.makePath('public/samples/sample-vase.stl')))
    const frames = renderTurntable(triangles, { size: 480, angles: [30, 120] })
    assert.lengthOf(frames, 2)
    if (SHOTS) {
      for (const f of frames) writeFileSync(`${SHOTS}/render-vase-${f.angle}.png`, f.png)
    }
  })
})
