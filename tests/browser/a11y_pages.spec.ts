import { test } from '@japa/runner'
import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from 'playwright'
import fabrmatchConfig from '#config/fabrmatch'
import RoleService from '#services/identity/role_service'
import MatchingService from '#services/matching/matching_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import { setPaymentProvider } from '#services/payments/provider_registry'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

/** WCAG 2.2 A/AA, the same rules as `npm run a11y`. */
async function violations(page: Page) {
  const { violations: found } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return found.map((v) => `${v.id}: ${v.help} — ${v.nodes[0]?.target.join(' ')}`)
}

async function signIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

test.group('accessibility of the newer pages (browser)', (group) => {
  group.each.setup(() => resetDatabase())
  group.each.teardown(() => {
    fabrmatchConfig.matching.autoOffer = 1
    setPaymentProvider(null)
  })

  test('public: use cases, product page with finishing and colour picker', async ({
    visit,
    assert,
  }) => {
    const shop = await createStorefrontProduct({ title: 'Desk Organizer' })
    const page = await visit('/use-cases')
    assert.deepEqual(await violations(page), [])
    await page.goto(page.url().replace(/\/use-cases$/, '/use-cases/small-batch'))
    assert.deepEqual(await violations(page), [])

    await page.goto(
      page.url().replace(/\/use-cases\/.*$/, `/shop/${shop.product.id}/desk-organizer`)
    )
    await page.getByLabel('Finishing (optional)').selectOption('PAINT')
    await page.getByText('Paint colour').waitFor()
    assert.deepEqual(await violations(page), [])
  })

  test('admin: matching queue and order, finishing, reports, queues', async ({ visit, assert }) => {
    fabrmatchConfig.matching.autoOffer = 0
    const maker = await createManufacturer()
    await new RoleService().assignRole(maker.user, 'manufacturer')
    await createPrinter(maker.profile)
    const idle = await createManufacturer()
    await createPrinter(idle.profile, { slotMinutes: 0 })
    const provider = new FakePaymentProvider('a11y')
    setPaymentProvider(provider)
    const { order, buyer } = await createDraftOrder()
    await new PaymentService(provider, (id) => new MatchingService().start(id)).simulateSuccess(
      order.id,
      buyer.id
    )
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')

    const page = await visit('/login')
    await signIn(page, admin.email)
    const origin = new URL(page.url()).origin
    for (const path of [
      '/admin/matching',
      `/admin/matching/${order.id}`,
      '/admin/finishing',
      '/admin/reports',
      '/admin/queues',
    ]) {
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' })
      assert.deepEqual(await violations(page), [], path)
    }
  })

  test('buyer: the test payment page', async ({ visit, assert }) => {
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')
    const { order } = await createDraftOrder(buyer)
    const page = await visit('/login')
    await signIn(page, buyer.email)
    const origin = new URL(page.url()).origin
    await page.goto(`${origin}/orders/${order.id}`)
    await page.getByRole('button', { name: 'Pay now' }).click()
    await page.waitForURL(/\/dev\/checkout\//)
    await page.getByRole('button', { name: 'Fill in' }).waitFor()
    assert.deepEqual(await violations(page), [])
  })

  test('new member: role selection', async ({ visit, assert }) => {
    const fresh = await createUser('fresh')
    const page = await visit('/login')
    await signIn(page, fresh.email)
    await page.getByText('I just want something printed').waitFor()
    assert.deepEqual(await violations(page), [])
  })
})
