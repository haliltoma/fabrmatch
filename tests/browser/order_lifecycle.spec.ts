import { test } from '@japa/runner'
import type { Page } from 'playwright'
import Dispute from '#models/dispute'
import JobQcPhoto from '#models/job_qc_photo'
import Order from '#models/order'
import Payment from '#models/payment'
import ProductionJob from '#models/production_job'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import {
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

async function signIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

async function status(orderId: string) {
  const order = await Order.findOrFail(orderId)
  return order.status
}

test.group('order lifecycle (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('buyer pays with the test card, a maker prints and ships, the buyer completes', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const shop = await createStorefrontProduct({ title: 'Cable Clip' })
    const maker = await createManufacturer()
    await new RoleService().assignRole(maker.user, 'manufacturer')
    await createPrinter(maker.profile)
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')

    // 1. buyer orders from the shop and pays on the test payment page
    const page = await visit('/login')
    await signIn(page, buyer.email)
    const origin = new URL(page.url()).origin
    await page.goto(`${origin}/shop/${shop.product.id}/cable-clip`)
    // the buyer picks the colour (Paket Y); nothing is chosen for them
    await page.getByRole('checkbox', { name: 'Black' }).check({ force: true })
    await page.getByLabel('Full name').fill('Deniz Yılmaz')
    await page.getByLabel('Address').fill('Bahariye Cd. 12')
    await page.getByLabel('City').fill('Istanbul')
    await page.getByLabel('Postal code').fill('34710')
    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await page.waitForURL(/\/orders\/[0-9a-f-]{36}$/)
    const orderId = new URL(page.url()).pathname.split('/').pop()!

    await page.getByRole('button', { name: 'Pay now' }).click()
    await page.waitForURL(/\/dev\/checkout\//)
    await page.getByRole('button', { name: 'Fill in' }).click()
    await page.getByRole('button', { name: /^Pay/ }).click()
    await page.waitForURL(/\/orders\/[0-9a-f-]{36}$/)
    const payment = await Payment.query().where('orderId', orderId).firstOrFail()
    assert.equal(payment.status, 'succeeded')
    // automatic matching (the test default) sent the offer to the only fitting maker
    assert.equal(await status(orderId), 'matching')

    // 2. the maker accepts, prints and ships
    await browserContext.clearCookies()
    await page.goto(`${origin}/login`)
    await signIn(page, maker.user.email)
    await page.goto(`${origin}/maker/work`)
    await page.getByRole('button', { name: 'Accept' }).click()
    await page.getByRole('button', { name: 'Start printing' }).waitFor()
    assert.equal(await status(orderId), 'in_production')
    await page.getByRole('button', { name: 'Start printing' }).click()
    await page.getByRole('button', { name: 'Mark produced' }).click()
    await page.getByLabel('Carrier').waitFor()

    // the photo upload goes straight to S3 from the browser; stand in for it with the stored row
    const job = await ProductionJob.query().where('orderId', orderId).firstOrFail()
    await JobQcPhoto.create({ productionJobId: job.id, storageKey: `qc/${job.id}/e2e.jpg` })
    await page.reload()
    await page.getByLabel('Carrier').fill('Yurtiçi')
    await page.getByLabel('Tracking number').fill('1234567890')
    await page.getByRole('button', { name: 'Mark as shipped' }).click()
    await page.getByText('Shipped via').waitFor()
    assert.equal(await status(orderId), 'shipped')
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lifecycle-maker.png`, fullPage: true })

    // 3. the buyer confirms delivery and completes the order
    await browserContext.clearCookies()
    await page.goto(`${origin}/login`)
    await signIn(page, buyer.email)
    await page.goto(`${origin}/orders/${orderId}`)
    await page.getByRole('button', { name: 'Confirm delivery' }).click()
    await page.getByRole('button', { name: 'Complete order' }).click()
    await page.getByRole('button', { name: 'Complete order' }).waitFor({ state: 'detached' })
    assert.equal(await status(orderId), 'completed')
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lifecycle-buyer.png`, fullPage: true })
  })

  test('a delivered order is disputed, the maker answers and the admin refunds it', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { order, buyer, makerUser } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'delivered',
    })
    await new RoleService().assignRole(buyer, 'seller')
    await new RoleService().assignRole(makerUser, 'manufacturer')
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')

    // buyer opens the dispute
    const page = await visit('/login')
    await signIn(page, buyer.email)
    const origin = new URL(page.url()).origin
    await page.goto(`${origin}/orders/${order.id}`)
    await page
      .getByPlaceholder('Describe the problem (at least 10 characters)')
      .fill('The part arrived cracked along one side.')
    await page.getByRole('button', { name: 'Open dispute' }).click()
    await page.getByText('Something wrong?', { exact: true }).waitFor({ state: 'detached' })
    assert.equal(await status(order.id), 'disputed')
    const dispute = await Dispute.query().where('orderId', order.id).firstOrFail()

    // maker answers
    await browserContext.clearCookies()
    await page.goto(`${origin}/login`)
    await signIn(page, makerUser.email)
    await page.goto(`${origin}/maker/work`)
    await page.getByPlaceholder('Your side of the story').fill('Packed with foam; carrier damage.')
    await page.getByRole('button', { name: 'Send response' }).click()
    await page.getByRole('button', { name: 'Update response' }).waitFor()

    // admin decides: full refund
    await browserContext.clearCookies()
    await page.goto(`${origin}/login`)
    await signIn(page, admin.email)
    await page.goto(`${origin}/admin/disputes/${dispute.id}`)
    await page.getByText('Packed with foam; carrier damage.').waitFor()
    await page.getByLabel(/Full refund/).check()
    await page.getByRole('button', { name: 'Apply decision' }).click()
    await page.getByRole('button', { name: 'Apply decision' }).waitFor({ state: 'detached' })
    await dispute.refresh()
    assert.equal(dispute.status, 'resolved')
    assert.equal(await status(order.id), 'resolved')
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/lifecycle-dispute.png`, fullPage: true })
  })
})
