import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import ProductionJob from '#models/production_job'
import QcPhotoService from '#services/manufacturing/qc_photo_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import { createFundedOrder, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'
import { orientationOf, stripImageMetadata } from '#services/files/image_metadata'

const GPS = Buffer.from('Exif\0\0GPSLatitude 41.0082 GPSLongitude 28.9784 Canon EOS owner Ali')

/** JPEG: SOI, APP0 (JFIF, kept), APP1 (Exif, dropped), COM (dropped), SOS + scan data, EOI. */
function jpeg() {
  const seg = (marker: number, body: Buffer) => {
    const len = Buffer.alloc(2)
    len.writeUInt16BE(body.length + 2)
    return Buffer.concat([Buffer.from([0xff, marker]), len, body])
  }
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    seg(0xe1, GPS),
    seg(0xfe, Buffer.from('shot at the workshop')),
    seg(0xdb, Buffer.alloc(65, 1)), // quantisation table, kept
    seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56]), // entropy-coded data with a stuffed byte
    Buffer.from([0xff, 0xd9]),
  ])
}

function crc32(buf: Buffer) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function png() {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])),
    chunk('eXIf', GPS),
    chunk('tEXt', Buffer.from('Author\0Ali Veli')),
    chunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0, 0, 0, 2, 0, 1])),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function webp() {
  const chunk = (fourcc: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32LE(data.length)
    const pad = data.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)
    return Buffer.concat([Buffer.from(fourcc, 'latin1'), len, data, pad])
  }
  // VP8X flags: bit 3 = EXIF, bit 2 = XMP
  const vp8x = Buffer.alloc(10)
  vp8x[0] = 0b0000_1100
  const body = Buffer.concat([
    Buffer.from('WEBP', 'latin1'),
    chunk('VP8X', vp8x),
    chunk('VP8 ', Buffer.alloc(20, 7)),
    chunk('EXIF', GPS),
    chunk('XMP ', Buffer.from('<x:xmpmeta>GPS</x:xmpmeta>')),
  ])
  const size = Buffer.alloc(4)
  size.writeUInt32LE(body.length)
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), size, body])
}

test.group('image metadata stripping (review fix 6)', () => {
  test('JPEG loses EXIF/GPS and comments, keeps the picture', ({ assert }) => {
    const out = stripImageMetadata(jpeg(), 'image/jpeg')
    assert.notInclude(out.toString('latin1'), 'GPSLatitude')
    assert.notInclude(out.toString('latin1'), 'workshop')
    assert.include(out.toString('latin1'), 'JFIF')
    assert.deepEqual([...out.subarray(0, 2)], [0xff, 0xd8])
    assert.deepEqual([...out.subarray(-2)], [0xff, 0xd9])
    // scan data untouched
    assert.include(out.toString('hex'), '1234ff0056')
  })

  test('a JPEG keeps only its orientation, so phone photos still show the right way up', ({
    assert,
  }) => {
    // Exif header + big-endian TIFF with IFD0: Orientation=6, GPS IFD pointer, Make
    const tiff = Buffer.alloc(8 + 2 + 12 * 3 + 4 + 16)
    tiff.write('MM', 0, 'latin1')
    tiff.writeUInt16BE(42, 2)
    tiff.writeUInt32BE(8, 4)
    tiff.writeUInt16BE(3, 8)
    const entry = (i: number, tag: number, type: number, count: number, value: number) => {
      const o = 10 + i * 12
      tiff.writeUInt16BE(tag, o)
      tiff.writeUInt16BE(type, o + 2)
      tiff.writeUInt32BE(count, o + 4)
      if (type === 3) tiff.writeUInt16BE(value, o + 8)
      else tiff.writeUInt32BE(value, o + 8)
    }
    entry(0, 0x010f, 2, 4, 0x416c6900) // Make "Ali"
    entry(1, 0x0112, 3, 1, 6) // Orientation: rotate 90
    entry(2, 0x8825, 4, 1, 50) // GPS IFD offset
    tiff.write('GPSDATA', 50, 'latin1')
    const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
    const len = Buffer.alloc(2)
    len.writeUInt16BE(app1.length + 2)
    const img = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
      len,
      app1,
      Buffer.from([0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 0xaa, 0xff, 0xd9]),
    ])
    const out = stripImageMetadata(img, 'image/jpeg')
    assert.notInclude(out.toString('latin1'), 'GPSDATA')
    assert.notInclude(out.toString('latin1'), 'Ali')
    assert.equal(orientationOf(out), 6)
  })

  test('images appended after the JPEG (iPhone MPF) and the MPF index are dropped', ({
    assert,
  }) => {
    const mpf = Buffer.concat([Buffer.from('MPF\0', 'latin1'), Buffer.alloc(20, 1)])
    const len = Buffer.alloc(2)
    len.writeUInt16BE(mpf.length + 2)
    const icc = Buffer.from('ICC_PROFILE\0\x01\x01colour', 'latin1')
    const iccLen = Buffer.alloc(2)
    iccLen.writeUInt16BE(icc.length + 2)
    const main = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe2]),
      len,
      mpf,
      Buffer.from([0xff, 0xe2]),
      iccLen,
      icc,
      Buffer.from([0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 0xaa, 0xff, 0xd9]),
    ])
    const out = stripImageMetadata(Buffer.concat([main, jpeg()]), 'image/jpeg')
    assert.notInclude(out.toString('latin1'), 'GPSLatitude')
    assert.notInclude(out.toString('latin1'), 'MPF')
    assert.include(out.toString('latin1'), 'ICC_PROFILE')
    assert.deepEqual([...out.subarray(-2)], [0xff, 0xd9])
  })

  test('PNG loses eXIf and text chunks, keeps image chunks with valid CRCs', ({ assert }) => {
    const out = stripImageMetadata(png(), 'image/png')
    const text = out.toString('latin1')
    assert.notInclude(text, 'GPSLatitude')
    assert.notInclude(text, 'Ali Veli')
    for (const kept of ['IHDR', 'IDAT', 'IEND']) assert.include(text, kept)
  })

  test('WebP loses EXIF and XMP chunks, clears their flags and fixes the RIFF size', ({
    assert,
  }) => {
    const out = stripImageMetadata(webp(), 'image/webp')
    const text = out.toString('latin1')
    assert.notInclude(text, 'GPSLatitude')
    assert.notInclude(text, 'xmpmeta')
    assert.equal(out.readUInt32LE(4), out.length - 8)
    const flags = out[20]
    assert.equal(flags & 0b0000_1100, 0)
  })

  test('anything unrecognised is refused rather than passed through', ({ assert }) => {
    assert.throws(() => stripImageMetadata(Buffer.from('not an image'), 'image/jpeg'))
  })
})

test.group('photos are cleaned when registered (review fix 6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('a QC photo with GPS is stored without it', async ({ assert }) => {
    const { order, profile } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'in_production',
    })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    const key = `qc/${job.id}/00000000-0000-4000-8000-000000000000.jpg`
    await drive.use('s3').put(key, jpeg(), { contentType: 'image/jpeg' })

    await new QcPhotoService().register(job.id, profile.id, key)

    const stored = Buffer.from(await drive.use('s3').getBytes(key))
    assert.notInclude(stored.toString('latin1'), 'GPSLatitude')
    assert.include(stored.toString('latin1'), 'JFIF')
  })
})
