import { test } from '@japa/runner'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import { createAnalyzedFile, createUser, resetDatabase } from '#tests/helpers/order_fixtures'

test.group('buyer journey (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('sign in, price a model, add it to the cart, check out, land on the order', async ({
    visit,
    assert,
  }) => {
    const user = await createUser('journey')
    await new RoleService().assignRole(user, 'seller')
    const file = await createAnalyzedFile(user, 12_000)

    const page = await visit('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))

    await page.goto(`${page.url().split('/').slice(0, 3).join('/')}/files/${file.id}/quote`)
    await page.getByRole('button', { name: 'Calculate Price' }).click()
    await page.getByText('Price Breakdown').waitFor()
    await page.getByRole('button', { name: 'Add to cart' }).click()

    await page.getByRole('heading', { name: 'Your cart' }).waitFor()
    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Address').fill('Bağdat Cd. 1')
    await page.getByLabel('City').fill('Istanbul')
    await page.getByLabel('Postal code').fill('34000')
    await page.getByRole('button', { name: 'Continue to payment' }).click()

    await page.waitForURL(/\/orders\/[0-9a-f-]{36}$/)
    const orders = await Order.query().where('buyerId', user.id)
    assert.lengthOf(orders, 1)
    assert.equal(orders[0].status, 'draft')
    assert.isAbove(orders[0].totalMinor, 0)
    await page.getByText(orders[0].code).first().waitFor()
  })

  test('a visitor gets an instant price without an account', async ({ visit, assert }) => {
    const page = await visit('/tools/quick-quote')
    await page.getByRole('button', { name: 'Get the price' }).waitFor()
    assert.isTrue(
      await page.getByRole('button', { name: 'Get the price' }).isDisabled(),
      'needs a file first'
    )
  })
})
