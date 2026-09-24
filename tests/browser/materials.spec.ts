import { test } from '@japa/runner'
import { ensureReferenceCatalog, resetDatabase } from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

test.group('material pages (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('a material page without makers is honest and marked noindex', async ({ visit, assert }) => {
    await ensureReferenceCatalog()
    const page = await visit('/materials/pla')
    await page.getByRole('heading', { name: 'PLA', exact: true }).waitFor()
    await page.getByText('still onboarding makers').waitFor()
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute('content'),
      'noindex, follow'
    )
    await page.getByRole('heading', { name: 'Nerede iyi çalışır' }).waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/material-pla.png`, fullPage: true })
  })
})
