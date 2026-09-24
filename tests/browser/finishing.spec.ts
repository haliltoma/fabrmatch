import { test } from '@japa/runner'
import RoleService from '#services/identity/role_service'
import {
  createAnalyzedFile,
  createManufacturer,
  createUser,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

async function signIn(
  page: {
    getByLabel(name: string): { fill(value: string): Promise<void> }
    getByRole(role: 'button', options: { name: string }): { click(): Promise<void> }
    waitForURL(predicate: (url: URL) => boolean): Promise<void>
  },
  email: string
) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

test.group('finishing (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('a buyer adds a finishing on the quote page and the price follows', async ({
    visit,
    assert,
  }) => {
    const user = await createUser('buyer')
    await new RoleService().assignRole(user, 'seller')
    const file = await createAnalyzedFile(user, 12_000)
    const page = await visit('/login')
    await signIn(page, user.email)
    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/files/${file.id}/quote`)

    const unit = async () => {
      await page.getByRole('button', { name: 'Calculate Price' }).click()
      await page.getByText('Price Breakdown').waitFor()
      return page
        .getByText('Price Breakdown')
        .locator('xpath=ancestor::*[self::div][3]')
        .innerText()
    }
    const before = await unit()
    await page.getByLabel('Finishing').selectOption({ label: 'Sanded · +15.00 TRY each' })
    const after = await unit()
    assert.notEqual(before, after)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/quote-finishing.png`, fullPage: true })
  })

  test('a maker ticks what they offer and it is saved', async ({ visit, assert }) => {
    const { user } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    const page = await visit('/login')
    await signIn(page, user.email)
    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/maker/finishing`)
    await page.getByRole('heading', { name: 'Finishing you offer' }).waitFor()
    await page.getByLabel(/^Sanded ·/).check()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByText('Saved.').first().waitFor()
    await page.reload()
    assert.isTrue(await page.getByLabel(/^Sanded ·/).isChecked())
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/maker-finishing.png`, fullPage: true })
  })
})
