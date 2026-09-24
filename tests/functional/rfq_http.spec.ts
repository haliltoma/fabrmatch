/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import ManufacturerProfile from '#models/manufacturer_profile'
import Order from '#models/order'
import Rfq from '#models/rfq'
import RfqBid from '#models/rfq_bid'
import OnboardingService from '#services/identity/onboarding_service'
import RoleService from '#services/identity/role_service'
import RfqBidService from '#services/rfq/rfq_bid_service'
import RfqService from '#services/rfq/rfq_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const flags = fabrmatchConfig.flags as Record<string, number>

async function corporateBuyer() {
  const user = await createUser('corp')
  await new OnboardingService().createSellerProfile(user, {
    businessName: 'Corp Ltd',
    isCorporate: true,
  })
  return user
}

async function makerUser() {
  const { user, profile } = await createManufacturer()
  await new RoleService().assignRole(user, 'manufacturer')
  await createPrinter(profile, { slotMinutes: 200_000 })
  return { user, profile }
}

test.group('requests for quotes over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.teardown(() => {
    flags.rfq = 0
  })

  test('the feature does not exist while it is off', async ({ client }) => {
    const buyer = await corporateBuyer()
    const { user } = await makerUser()
    ;(await client.get('/rfqs').loginAs(buyer)).assertStatus(404)
    ;(await client.get('/maker/rfqs').loginAs(user)).assertStatus(404)
    const shared = await client.get('/').headers(inertia).loginAs(buyer)
    shared.assertStatus(200)
  })

  test('a corporate buyer opens a request; a private account cannot', async ({
    client,
    assert,
  }) => {
    flags.rfq = 1
    const buyer = await corporateBuyer()
    const invited = await makerUser()
    const file = await createAnalyzedFile(buyer, 8000)

    const created = await client
      .post('/rfqs')
      .loginAs(buyer)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        modelFileId: file.id,
        title: 'Housing batch',
        material: 'pla',
        quantity: 200,
        shipCountry: 'tr',
        bidDays: 4,
        maxLeadDays: 12,
      })
    created.assertStatus(302)
    const rfq = await Rfq.firstOrFail()
    assert.equal(created.header('location'), `/rfqs/${rfq.id}`)
    assert.equal(rfq.shipCountry, 'TR')
    assert.equal(rfq.material, 'PLA')

    const list = await client.get('/rfqs').headers(inertia).loginAs(buyer)
    assert.lengthOf(list.body().props.rfqs, 1)
    assert.isDefined(invited)

    const privateUser = await createUser('private')
    await new OnboardingService().createSellerProfile(privateUser, {
      businessName: 'Solo',
      isCorporate: false,
    })
    const file2 = await createAnalyzedFile(privateUser)
    const refused = await client
      .post('/rfqs')
      .loginAs(privateUser)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({
        modelFileId: file2.id,
        title: 'Solo job',
        material: 'PLA',
        quantity: 20,
        shipCountry: 'TR',
        bidDays: 3,
        maxLeadDays: 10,
      })
    refused.assertStatus(422)
    assert.lengthOf(await Rfq.all(), 1)
  })

  test('the maker sees only invited requests, without any buyer detail, and can bid', async ({
    client,
    assert,
  }) => {
    flags.rfq = 1
    const buyer = await corporateBuyer()
    const invited = await makerUser()
    const outsider = await createManufacturer({ country: 'DE' })
    await new RoleService().assignRole(outsider.user, 'manufacturer')
    const file = await createAnalyzedFile(buyer, 8000)
    const rfq = await new RfqService().create(buyer, {
      modelFileId: file.id,
      title: 'Housing batch',
      material: 'PLA',
      quantity: 200,
      shipCountry: 'TR',
      bidDays: 4,
      maxLeadDays: 12,
    })

    const list = await client.get('/maker/rfqs').headers(inertia).loginAs(invited.user)
    assert.lengthOf(list.body().props.rfqs, 1)
    const page = await client.get(`/maker/rfqs/${rfq.id}`).headers(inertia).loginAs(invited.user)
    page.assertStatus(200)
    const text = JSON.stringify(page.body().props)
    for (const forbidden of [
      buyer.email,
      buyer.fullName ?? '@@',
      'Corp Ltd',
      'buyerId',
      'modelFileId',
    ]) {
      assert.notInclude(text, forbidden)
    }
    assert.isNotNull(page.body().props.rfq.bboxMm)

    ;(await client.get(`/maker/rfqs/${rfq.id}`).loginAs(outsider.user)).assertStatus(404)
    ;(
      await client
        .post(`/maker/rfqs/${rfq.id}/bid`)
        .loginAs(outsider.user)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json({ price: 12, leadDays: 5 })
    ).assertStatus(422)

    const bid = await client
      .post(`/maker/rfqs/${rfq.id}/bid`)
      .loginAs(invited.user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ price: 12.5, leadDays: 6, note: 'call 0555 111 22 33' })
    bid.assertStatus(302)
    const stored = await RfqBid.firstOrFail()
    assert.equal(stored.unitPriceMinor, 1250)
    assert.notInclude(stored.note ?? '', '0555')

    const tooLong = await client
      .post(`/maker/rfqs/${rfq.id}/bid`)
      .loginAs(invited.user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ price: 12.5, leadDays: 30 })
    tooLong.assertStatus(422)
  })

  test('the buyer compares offers without identities and chooses one, ending at an order', async ({
    client,
    assert,
  }) => {
    flags.rfq = 1
    const buyer = await corporateBuyer()
    const a = await makerUser()
    const b = await makerUser()
    const file = await createAnalyzedFile(buyer, 8000)
    const rfq = await new RfqService().create(buyer, {
      modelFileId: file.id,
      title: 'Housing batch',
      material: 'PLA',
      quantity: 40,
      shipCountry: 'TR',
      bidDays: 4,
      maxLeadDays: 12,
    })
    const bids = new RfqBidService()
    const one = await bids.submit(rfq.id, a.profile.id, { unitPriceMinor: 1500, leadDays: 6 })
    await bids.submit(rfq.id, b.profile.id, {
      unitPriceMinor: 1100,
      leadDays: 9,
      note: 'Fast start',
    })

    const page = await client.get(`/rfqs/${rfq.id}`).headers(inertia).loginAs(buyer)
    page.assertStatus(200)
    assert.lengthOf(page.body().props.bids, 2)
    const text = JSON.stringify(page.body().props)
    for (const m of [a, b]) {
      const profile = await ManufacturerProfile.findOrFail(m.profile.id)
      for (const forbidden of [profile.publicAlias, m.user.email, m.user.fullName ?? '@@']) {
        assert.notInclude(text, forbidden)
      }
    }

    const stranger = await corporateBuyer()
    ;(await client.get(`/rfqs/${rfq.id}`).loginAs(stranger)).assertStatus(404)

    const award = await client
      .post(`/rfqs/${rfq.id}/award`)
      .loginAs(buyer)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ bidId: one.id, shippingAddress: TR_ADDRESS })
    award.assertStatus(302)
    const order = await Order.query().where('channel', 'rfq').firstOrFail()
    assert.equal(award.header('location'), `/orders/${order.id}`)
    assert.equal(order.buyerId, buyer.id)

    const after = await client.get(`/rfqs/${rfq.id}`).headers(inertia).loginAs(buyer)
    assert.equal(after.body().props.rfq.status, 'awarded')
    assert.equal(after.body().props.rfq.orderId, order.id)
  })
})
