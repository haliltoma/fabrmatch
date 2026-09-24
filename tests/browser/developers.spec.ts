import { test } from '@japa/runner'
import ApiKey from '#models/api_key'
import WebhookEndpoint from '#models/webhook_endpoint'
import { createStorefrontProduct, resetDatabase } from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

test.group('seller developers page (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('create a key and a webhook; secrets show once and never again', async ({
    visit,
    assert,
  }) => {
    const shop = await createStorefrontProduct()

    const page = await visit('/login')
    await page.getByLabel('Email').fill(shop.sellerUser.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))

    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/seller/developers`)
    await page.getByRole('heading', { name: 'Developers' }).waitFor()
    await page.getByText('No API keys yet').waitFor()

    await page.getByLabel('Key name').fill('Warehouse system')
    await page.getByRole('button', { name: 'Create key' }).click()
    await page.getByText('Your new API key').waitFor()
    const shown = await page.locator('p.select-all').first().innerText()
    assert.match(shown, /^fmk_[0-9a-f]{48}$/)
    const stored = await ApiKey.query().where('userId', shop.sellerUser.id).firstOrFail()
    assert.notEqual(stored.keyHash, shown)

    await page.getByLabel('Endpoint URL').fill('https://hooks.example.com/fabrmatch')
    await page.getByRole('button', { name: 'Add webhook' }).click()
    await page.getByText('Your webhook signing secret').waitFor()
    assert.lengthOf(await WebhookEndpoint.all(), 1)

    if (SHOTS) {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.screenshot({ path: `${SHOTS}/developers-1280.png`, fullPage: true })
      await page.setViewportSize({ width: 375, height: 800 })
      await page.screenshot({ path: `${SHOTS}/developers-375.png`, fullPage: true })
    }

    await page.reload()
    await page.getByRole('heading', { name: 'Developers' }).waitFor()
    assert.equal(await page.getByText('Your new API key').count(), 0)
    assert.equal(await page.getByText('Your webhook signing secret').count(), 0)
    await page.getByText('Warehouse system').waitFor()
  })
})
