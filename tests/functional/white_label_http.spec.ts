import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ProductionJob from '#models/production_job'
import SellerProfile from '#models/seller_profile'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import RoleService from '#services/identity/role_service'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('white label over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a seller sets their brand; the page shows it back', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    const saved = await client
      .post('/seller/branding')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ brandName: 'Mavi Atölye', brandMessage: 'Enjoy!' })
    saved.assertStatus(302)
    const profile = await SellerProfile.query().where('userId', shop.sellerUser.id).firstOrFail()
    assert.equal(profile.brandName, 'Mavi Atölye')

    const page = await client.get('/seller/branding').headers(inertia).loginAs(shop.sellerUser)
    assert.equal(page.body().props.brandName, 'Mavi Atölye')

    const bad = await client
      .post('/seller/branding')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ brandMessage: 'no name' })
    bad.assertStatus(422)
  })

  test('the maker prints the card of their own job as HTML, nobody else can', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    await SellerProfile.query()
      .where('userId', shop.sellerUser.id)
      .update({ brand_name: 'Mavi Atölye' })
    const buyer = await createUser('buyer')
    const order = await new OrderService().createStorefrontDraft(buyer, shop.product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const sm = new OrderStateMachine()
    for (const to of ['awaiting_payment', 'paid', 'matching'] as const) {
      await sm.transition(order.id, to)
    }
    const maker = await createManufacturer()
    await new RoleService().assignRole(maker.user, 'manufacturer')
    const printer = await createPrinter(maker.profile)
    const job = await ProductionJob.create({
      orderId: order.id,
      manufacturerProfileId: maker.profile.id,
      printerId: printer.id,
      status: 'accepted',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
    })
    await sm.transition(order.id, 'in_production')

    const slip = await client.get(`/maker/jobs/${job.id}/packing-slip`).loginAs(maker.user)
    slip.assertStatus(200)
    assert.include(slip.header('content-type') ?? '', 'text/html')
    assert.include(slip.text(), 'Mavi Atölye')
    assert.notInclude(slip.text(), 'Fabrmatch')

    const other = await createManufacturer()
    await new RoleService().assignRole(other.user, 'manufacturer')
    const denied = await client.get(`/maker/jobs/${job.id}/packing-slip`).loginAs(other.user)
    denied.assertStatus(404)
    assert.notInclude(denied.text(), 'Mavi Atölye')
  })
})
