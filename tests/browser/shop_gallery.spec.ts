import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import { readFileSync } from 'node:fs'
import ModelFile from '#models/model_file'
import ProductImageService from '#services/catalog/product_image_service'
import { createStorefrontProduct, resetDatabase } from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

test.group('shop gallery (browser)', (group) => {
  group.each.setup(() => resetDatabase())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('the product page shows the render and the buyer can turn it', async ({ visit, assert }) => {
    const shop = await createStorefrontProduct({ title: 'Sample Vase' })
    const file = await ModelFile.findOrFail(shop.catalog.modelFileId!)
    await drive
      .use('s3')
      .put(file.storageKey, readFileSync(app.makePath('public/samples/sample-vase.stl')))
    await new ProductImageService().renderModel(file.id)

    const page = await visit('/shop')
    await page.getByRole('img', { name: 'Sample Vase' }).waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/shop-cards.png` })

    await page
      .getByRole('link', { name: /Sample Vase/ })
      .first()
      .click()
    const slider = page.getByLabel('Turn the part')
    await slider.waitFor()
    assert.equal(await slider.inputValue(), '0')
    await slider.press('ArrowRight')
    await slider.press('ArrowRight')
    assert.equal(await slider.inputValue(), '2')
    await page.getByRole('img', { name: /turned to 120°/ }).waitFor()
    assert.equal(
      await page
        .locator('meta[property="og:image"]')
        .getAttribute('content')
        .then((u) => !!u),
      true
    )
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/shop-gallery.png`, fullPage: true })
  })
})
