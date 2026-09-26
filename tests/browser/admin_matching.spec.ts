import { test } from '@japa/runner'
import fabrmatchConfig from '#config/fabrmatch'
import MatchOffer from '#models/match_offer'
import RoleService from '#services/identity/role_service'
import MatchingService from '#services/matching/matching_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import { setPaymentProvider } from '#services/payments/provider_registry'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR

test.group('admin matching (browser)', (group) => {
  group.each.setup(() => resetDatabase())
  group.each.teardown(() => {
    fabrmatchConfig.matching.autoOffer = 1
    setPaymentProvider(null)
  })

  test('admin opens a waiting order, picks the suggested maker and sends the offer', async ({
    visit,
    assert,
  }) => {
    fabrmatchConfig.matching.autoOffer = 0
    const makers = []
    for (let i = 0; i < 2; i++) {
      const m = await createManufacturer({ city: i === 0 ? 'Istanbul' : 'Ankara' })
      await new RoleService().assignRole(m.user, 'manufacturer')
      await createPrinter(m.profile)
      makers.push(m)
    }
    const busy = await createManufacturer({ city: 'Izmir' })
    await new RoleService().assignRole(busy.user, 'manufacturer')
    await createPrinter(busy.profile, { slotMinutes: 0, build: [5, 5, 5] })

    const provider = new FakePaymentProvider('admin-matching-browser')
    setPaymentProvider(provider)
    const { order, buyer } = await createDraftOrder()
    await new PaymentService(provider, (id) => new MatchingService().start(id)).simulateSuccess(
      order.id,
      buyer.id
    )

    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')

    const page = await visit('/login')
    await page.getByLabel('Email').fill(admin.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => url.pathname === '/admin')

    await page.goto(page.url().replace(/\/admin$/, '/admin/matching'))
    await page.getByRole('heading', { name: /Needs a maker/ }).waitFor()
    await page.getByText('Manual').first().waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-matching.png`, fullPage: true })

    await page.getByText(order.code).click()
    await page.getByRole('heading', { name: /Suggested makers/ }).waitFor()
    await page.getByText('Best fit').waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-matching-order.png`, fullPage: true })

    // open by default in manual mode, so the admin sees what every other maker is missing
    await page.getByText(/does not fit 5 × 5 × 5 mm/).waitFor()
    await page.getByText(/min free in 5 days/).waitFor()
    if (SHOTS) {
      await page.screenshot({ path: `${SHOTS}/admin-matching-not-eligible.png`, fullPage: true })
    }

    await page.getByRole('button', { name: 'Match with this maker' }).first().click()
    await page.getByRole('dialog').waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-matching-confirm.png` })
    await page.getByRole('button', { name: 'Send offer' }).click()
    await page.getByText(/Offer sent to/).waitFor()

    const offers = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(offers, 1)
    assert.equal(offers[0].status, 'pending')
    assert.include(
      makers.map((m) => m.profile.id),
      offers[0].manufacturerProfileId
    )
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-matching-sent.png`, fullPage: true })
  })

  test('manual mode: admin matches a maker who misses rules after seeing what is missing', async ({
    visit,
    assert,
  }) => {
    fabrmatchConfig.matching.autoOffer = 0
    const busy = await createManufacturer({ city: 'Izmir' })
    await new RoleService().assignRole(busy.user, 'manufacturer')
    await createPrinter(busy.profile, { slotMinutes: 0 })

    const provider = new FakePaymentProvider('admin-matching-override')
    setPaymentProvider(provider)
    const { order, buyer } = await createDraftOrder()
    await new PaymentService(provider, (id) => new MatchingService().start(id)).simulateSuccess(
      order.id,
      buyer.id
    )
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')

    const page = await visit('/login')
    await page.getByLabel('Email').fill(admin.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => url.pathname === '/admin')
    await page.goto(page.url().replace(/\/admin$/, `/admin/matching/${order.id}`))

    await page.getByText('In manual mode you can still pick one below.').waitFor()
    await page.getByRole('button', { name: 'Match anyway' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('This maker does not meet these rules. Send the offer anyway?').waitFor()
    await dialog.getByText(/min free in 5 days/).waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-matching-override.png` })
    await dialog.getByRole('button', { name: 'Send offer anyway' }).click()
    await page.getByText(/Offer sent to/).waitFor()

    const offers = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(offers, 1)
    assert.equal(offers[0].manufacturerProfileId, busy.profile.id)
    assert.isTrue(offers[0].adminOverride)
  })
})
