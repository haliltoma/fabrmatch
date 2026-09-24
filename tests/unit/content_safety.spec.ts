import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CatalogProduct from '#models/catalog_product'
import ContentReport from '#models/content_report'
import ModelFile from '#models/model_file'
import ContentReportService, { ContentReportError } from '#services/admin/content_report_service'
import OrderService from '#services/orders/order_service'
import { scanModelFile } from '#services/files/file_scanner'
import StorefrontService from '#services/storefront/storefront_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createStorefrontProduct,
  createUser,
} from '#tests/helpers/order_fixtures'

function binaryStl(triangles = 1) {
  const buf = Buffer.alloc(84 + triangles * 50)
  buf.writeUInt32LE(triangles, 80)
  return buf
}

test.group('upload scan (R3-T11)', () => {
  test('real model files pass', ({ assert }) => {
    assert.isTrue(scanModelFile(binaryStl(3), 'STL').ok)
    assert.isTrue(scanModelFile(Buffer.from('solid x\nendsolid x\n'), 'STL').ok)
    assert.isTrue(scanModelFile(Buffer.from([0x50, 0x4b, 3, 4, 0]), '3MF').ok)
    assert.isTrue(scanModelFile(Buffer.from('v 0 0 0\nf 1 1 1\n'), 'OBJ').ok)
  })

  test('executables, scripts, test malware and mislabelled files are refused', ({ assert }) => {
    assert.match(
      scanModelFile(Buffer.from('MZ\x90\x00 padding'), 'STL').reason!,
      /Windows executable/
    )
    assert.match(
      scanModelFile(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 1]), 'OBJ').reason!,
      /Linux executable/
    )
    assert.match(scanModelFile(Buffer.from('#!/bin/sh\nrm -rf /'), 'OBJ').reason!, /script/)
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    assert.match(scanModelFile(Buffer.from(`solid ${eicar}`), 'STL').reason!, /malware/)
    assert.isFalse(scanModelFile(Buffer.from('not a zip at all'), '3MF').ok)
    assert.isFalse(scanModelFile(Buffer.from('random bytes here that are not stl'), 'STL').ok)
    assert.isFalse(scanModelFile(Buffer.from([118, 32, 0, 1, 2]), 'OBJ').ok)
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
      () => service.report(reporter.id, { sellerProductId: 999999, reason: 'other' }),
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
