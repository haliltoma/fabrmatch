import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import app from '@adonisjs/core/services/app'
import { readFileSync } from 'node:fs'
import ProductImage from '#models/product_image'
import ProductImageService from '#services/catalog/product_image_service'
import { DEFAULT_ANGLES } from '#services/files/model_renderer'
import { createAnalyzedFile, createUser } from '#tests/helpers/order_fixtures'

const VASE = readFileSync(app.makePath('public/samples/sample-vase.stl'))

test.group('ProductImageService (R4-T6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  async function storedFile() {
    const owner = await createUser('owner')
    const file = await createAnalyzedFile(owner)
    await drive.use('s3').put(file.storageKey, VASE)
    return file
  }

  test('renders a turntable once and stores it as approved shop images', async ({ assert }) => {
    const file = await storedFile()
    const service = new ProductImageService()

    assert.equal(await service.renderModel(file.id), DEFAULT_ANGLES.length)
    assert.equal(await service.renderModel(file.id), 0, 'second run is a no-op')

    const rows = await ProductImage.query().where('modelFileId', file.id)
    assert.lengthOf(rows, DEFAULT_ANGLES.length)
    assert.isTrue(rows.every((r) => r.kind === 'render' && r.status === 'approved'))
    assert.isTrue(await drive.use('s3').exists(rows[0].storageKey))

    const images = await service.forModelFiles([file.id])
    assert.lengthOf(images.get(file.id)!, DEFAULT_ANGLES.length)
    assert.equal(images.get(file.id)![0].url, `/images/${images.get(file.id)![0].id}`)
  })

  test('blocked or unreadable files are not rendered', async ({ assert }) => {
    const file = await storedFile()
    file.blockedAt = file.createdAt
    await file.save()
    assert.equal(await new ProductImageService().renderModel(file.id), 0)

    const other = await storedFile()
    other.format = '3MF'
    await other.save()
    assert.equal(await new ProductImageService().renderModel(other.id), 0)
  })

  test('pending and rejected pictures never reach the shop', async ({ assert }) => {
    const file = await storedFile()
    for (const status of ['pending', 'rejected'] as const) {
      await ProductImage.create({
        modelFileId: file.id,
        kind: 'maker_photo',
        status,
        storageKey: `product-images/photos/${status}.jpg`,
        contentType: 'image/jpeg',
      })
    }
    const images = await new ProductImageService().forModelFiles([file.id])
    assert.isUndefined(images.get(file.id))
  })
})
