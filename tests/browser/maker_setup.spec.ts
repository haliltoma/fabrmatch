import { test } from '@japa/runner'
import RoleService from '#services/identity/role_service'
import { createManufacturer, resetDatabase } from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

test.group('maker setup checklist (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('a new maker sees what is missing and a link to fix the next step', async ({ visit }) => {
    const { user } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    const page = await visit('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/maker`)
    await page.getByText('Get ready for your first offer').waitFor()
    await page.getByText('Add your printer').first().waitFor()
    await page.getByRole('link', { name: 'Add your printer' }).click()
    await page.waitForURL(/\/maker\/printers/)
    if (SHOTS) {
      await page.goto(`${origin}/maker`)
      await page.getByText('Get ready for your first offer').waitFor()
      await page.screenshot({ path: `${SHOTS}/maker-setup.png`, fullPage: true })
    }
  })
})
