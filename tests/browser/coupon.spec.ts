import { test } from '@japa/runner'
import RoleService from '#services/identity/role_service'
import CartService from '#services/orders/cart_service'
import CouponService from '#services/pricing/coupon_service'
import {
  createAnalyzedFile,
  createUser,
  ensureReferenceCatalog,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

test.group('coupon in the cart (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('a buyer applies a code and sees the discount; a wrong code explains itself', async ({
    visit,
    assert,
  }) => {
    await ensureReferenceCatalog()
    await new CouponService().create({ code: 'WELCOME10', kind: 'percent', value: 1000 })
    const user = await createUser('shopper')
    await new RoleService().assignRole(user, 'seller')
    const file = await createAnalyzedFile(user, 12_000)
    await new CartService().add(user, { modelFileId: file.id, material: 'PLA', quantity: 2 })

    const page = await visit('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/cart`)
    await page.getByRole('heading', { name: 'Your cart' }).waitFor()

    await page.getByLabel('Coupon code').fill('nope')
    await page.getByRole('button', { name: 'Apply' }).click()
    await page.getByRole('alert').getByText('This code is not valid').waitFor()

    await page.getByLabel('Coupon code').fill('welcome10')
    await page.getByRole('button', { name: 'Apply' }).click()
    await page.getByText('Coupon WELCOME10').waitFor()
    assert.equal(await page.getByRole('alert').count(), 0)
    const money = (label: string) =>
      page.locator('dl > div', { hasText: label }).locator('dd').innerText()
    const parse = (text: string) => Number(text.replace(/[^0-9.\-−]/g, '').replace('−', '-'))
    const items = parse(await money('Items'))
    const shipping = parse(await money('Shipping'))
    const coupon = parse(await money('Coupon'))
    const total = parse(await money('Total'))
    assert.approximately(items + shipping + coupon, total, 0.005)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cart-coupon.png`, fullPage: true })
  })
})
