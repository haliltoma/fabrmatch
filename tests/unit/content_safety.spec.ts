import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CatalogProduct from '#models/catalog_product'
import ContentReport from '#models/content_report'
import ModelFile from '#models/model_file'
import ContentReportService, { ContentReportError } from '#services/admin/content_report_service'
import OrderService from '#services/orders/order_service'
import { createHash } from 'node:crypto'
import { scanModelFile, scanUpload } from '#services/files/file_scanner'
import StorefrontService from '#services/storefront/storefront_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createStorefrontProduct,
  createUser,
} from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

function binaryStl(triangles = 1) {
  const buf = Buffer.alloc(84 + triangles * 50)
  buf.writeUInt32LE(triangles, 80)
  return buf
}

/** A stored (uncompressed) zip with the given entries; `declared` fakes an uncompressed size. */
function zip(entries: Array<{ name: string; data?: string; declared?: number }>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const e of entries) {
    const data = Buffer.from(e.data ?? 'x')
    const name = Buffer.from(e.name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(e.declared ?? data.length, 22)
    local.writeUInt16LE(name.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(e.declared ?? data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, data)
    centrals.push(central, name)
    offset += 30 + name.length + data.length
  }
  const dir = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(dir.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, dir, end])
}

const THREE_MF = [
  { name: '[Content_Types].xml' },
  { name: '_rels/.rels' },
  { name: '3D/3dmodel.model' },
]

test.group('upload scan (R3-T11)', () => {
  test('real model files pass', ({ assert }) => {
    assert.isTrue(scanModelFile(binaryStl(3), 'STL').ok)
    assert.isTrue(scanModelFile(Buffer.from('solid x\nendsolid x\n'), 'STL').ok)
    assert.isTrue(scanModelFile(zip(THREE_MF), '3MF').ok)
    assert.isTrue(scanModelFile(Buffer.from('v 0 0 0\nf 1 1 1\n'), 'OBJ').ok)
  })

  test('executables, scripts, test malware and mislabelled files are refused', ({ assert }) => {
    assert.match(scanModelFile(Buffer.from('MZ\x90\x00 padding'), 'STL').reason!, /Windows program/)
    assert.match(
      scanModelFile(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 1]), 'OBJ').reason!,
      /Linux program/
    )
    assert.match(scanModelFile(Buffer.from('#!/bin/sh\nrm -rf /'), 'OBJ').reason!, /script/)
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    assert.match(scanModelFile(Buffer.from(`solid ${eicar}`), 'STL').reason!, /malware/)
    assert.isFalse(scanModelFile(Buffer.from('not a zip at all'), '3MF').ok)
    assert.isFalse(scanModelFile(Buffer.from('random bytes here that are not stl'), 'STL').ok)
    assert.isFalse(scanModelFile(Buffer.from([118, 32, 0, 1, 2]), 'OBJ').ok)
  })

  test('content hidden inside a model is blocked', ({ assert }) => {
    const polyglot = 'solid x\nfacet normal 0 0 1\n<script>alert(1)</script>\nendsolid x\n'
    assert.match(scanModelFile(Buffer.from(polyglot), 'STL').reason!, /script/)

    const header = binaryStl(1)
    header.write('<?php system($_GET[c]); ?>', 0, 'latin1')
    assert.match(scanModelFile(header, 'STL').reason!, /PHP/)

    const junk = 'solid x\nfacet normal 0 0 1\nrm -rf /tmp\nendfacet\nendsolid x\n'
    assert.match(scanModelFile(Buffer.from(junk), 'STL').reason!, /not part of a 3D model/)

    const smuggled = Buffer.concat([Buffer.from('v 0 0 0\n'), Buffer.from([0x50, 0x4b, 3, 4])])
    assert.isFalse(scanModelFile(smuggled, 'OBJ').ok)

    const nan = binaryStl(1)
    nan.writeFloatLE(Number.NaN, 84 + 12)
    assert.match(scanModelFile(nan, 'STL').reason!, /invalid coordinates/)
  })

  test('3MF archives: path escapes, programs and zip bombs are refused', ({ assert }) => {
    assert.match(
      scanModelFile(zip([...THREE_MF, { name: '../../etc/passwd' }]), '3MF').reason!,
      /unsafe path/
    )
    assert.match(
      scanModelFile(zip([...THREE_MF, { name: 'Metadata/run.exe' }]), '3MF').reason!,
      /not part of a 3D model/
    )
    assert.match(
      scanModelFile(zip([{ name: '3D/3dmodel.model', declared: 50_000_000 }]), '3MF').reason!,
      /suspiciously compressed/
    )
  })

  test('the stored file must be exactly the one that was registered', async ({ assert }) => {
    const bytes = binaryStl(2)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const good = await scanUpload(bytes, 'STL', { sha256, sizeBytes: bytes.length })
    assert.isTrue(good.ok)
    assert.includeMembers(good.checks, [
      'size',
      'signatures',
      'active_content',
      'structure',
      'integrity',
    ])

    const swapped = await scanUpload(bytes, 'STL', { sha256: 'a'.repeat(64) })
    assert.isFalse(swapped.ok)
    assert.match(swapped.reason!, /does not match/)
  })
})

test.group('reports and moderation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const service = new ContentReportService()

  test('a member reports a listing once; admins see it', async ({ assert }) => {
    const { product } = await createStorefrontProduct()
    const reporter = await createUser('reporter')
    await service.report(reporter.id, {
      sellerProductId: product.id,
      reason: 'weapon',
      details: 'looks like a gun',
    })
    await assert.rejects(
      () => service.report(reporter.id, { sellerProductId: product.id, reason: 'weapon' }),
      /already reported/
    )
    await assert.rejects(
      () => service.report(reporter.id, { sellerProductId: uid(999999), reason: 'other' }),
      ContentReportError
    )
    const open = await service.listOpen()
    assert.lengthOf(open, 1)
    assert.equal(open[0].productTitle, product.title)
  })

  test('blocking hides the listing, stops orders and downloads, and closes sibling reports', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const { product, catalog } = await createStorefrontProduct()
    const a = await createUser('a')
    const b = await createUser('b')
    await service.report(a.id, { sellerProductId: product.id, reason: 'unsafe' })
    await service.report(b.id, { sellerProductId: product.id, reason: 'weapon' })
    const [first] = await service.listOpen()
    assert.isNotNull(await new StorefrontService().find(product.id))

    await service.block(first.id, admin.id, 'weapon design')
    const file = await ModelFile.findOrFail(catalog.modelFileId!)
    assert.isNotNull(file.blockedAt)
    assert.equal(file.blockedReason, 'weapon design')
    assert.isNull(await new StorefrontService().find(product.id))
    const catalogRow = await CatalogProduct.findOrFail(catalog.id)
    assert.isFalse(catalogRow.isActive)
    assert.lengthOf(await service.listOpen(), 0)
    const reports = await ContentReport.query()
    const statuses = reports.map((r) => r.status)
    assert.deepEqual(statuses, ['actioned', 'actioned'])

    // a blocked model cannot be ordered, even by its owner
    const buyer = await createUser('buyer')
    const own = await createAnalyzedFile(buyer)
    await ModelFile.query().where('id', own.id).update({ blocked_at: new Date() })
    await assert.rejects(
      () =>
        new OrderService().createDraftForItems(buyer, {
          items: [{ modelFileId: own.id, material: 'PLA', quantity: 1 }],
          shippingAddress: TR_ADDRESS,
        }),
      /removed by moderation/
    )
  })

  test('dismissing closes only that report', async ({ assert }) => {
    const admin = await createUser('admin')
    const { product } = await createStorefrontProduct()
    const r = await createUser('r')
    await service.report(r.id, { sellerProductId: product.id, reason: 'other' })
    const [report] = await service.listOpen()
    await service.dismiss(report.id, admin.id)
    assert.lengthOf(await service.listOpen(), 0)
    assert.isNotNull(await new StorefrontService().find(product.id))
    await assert.rejects(() => service.dismiss(report.id, admin.id), /not found/)
  })
})
