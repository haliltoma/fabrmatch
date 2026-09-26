import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import FinishingOption from '#models/finishing_option'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import FinishingService from '#services/catalog/finishing_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine from '#services/orders/order_state_machine'
import { productionDaysFor } from '#services/orders/production_window'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createAnalyzedFile,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const quiet: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

async function buyer() {
  const user = await createUser('buyer')
  await new RoleService().assignRole(user, 'seller')
  return user
}

test.group('finishing in the shop (R6-T6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the product page prices every finishing that suits its materials', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct({ materials: ['PLA', 'PETG'] })
    const page = await client.get(`/shop/${shop.product.id}/desk-organizer`).headers(inertia)
    const { options, finishings } = page.body().props.product
    const codes = finishings.map((f: { code: string }) => f.code)
    assert.includeMembers(codes, ['SAND', 'PRIME', 'PAINT'])
    assert.notInclude(codes, 'VAPOR', 'ABS-only finishing is not offered on PLA/PETG')

    const price = (finishing: string | null) =>
      options.find(
        (o: { material: string; finishing: string | null }) =>
          o.material === 'PLA' && o.finishing === finishing
      ).unitPriceMinor
    assert.isAbove(price('SAND'), price(null))
    assert.isAbove(price('PAINT'), price('SAND'))
  })

  test('a storefront order carries the finishing and its price', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    const user = await buyer()
    const order = (finishing?: string) =>
      client
        .post(`/shop/${shop.product.id}/order`)
        .loginAs(user)
        .withCsrfToken()
        .headers(inertia)
        .redirects(0)
        .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS, finishing })

    const plain = await order()
    plain.assertStatus(302)
    const painted = await client
      .post(`/shop/${shop.product.id}/order`)
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        material: 'PLA',
        quantity: 1,
        shippingAddress: TR_ADDRESS,
        finishing: 'paint',
        finishingColour: 'red',
      })
    painted.assertStatus(302)
    const [first, second] = await Order.query()
      .where('buyerId', user.id)
      .preload('items')
      .orderBy('id', 'asc')
    assert.isNull(first.items[0].finishingCode)
    assert.equal(second.items[0].finishingCode, 'PAINT')
    assert.equal(second.items[0].finishingColour, 'Red', 'stored as the catalogue name')
    assert.isAbove(second.totalMinor, first.totalMinor)

    const wrong = await client
      .post(`/shop/${shop.product.id}/order`)
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS, finishing: 'VAPOR' })
    wrong.assertStatus(422)
  })

  test('finishing days extend the capacity window and the due date', async ({ assert }) => {
    const admin = await createUser('admin')
    const paintOption = await FinishingOption.findByOrFail('code', 'PAINT')
    await new FinishingService().update(paintOption.id, { extraDays: 3 }, admin.id)
    const sla = fabrmatchConfig.orders.productionSlaDays
    assert.equal(await productionDaysFor([{ finishingCode: null }]), sla)
    assert.equal(await productionDaysFor([{ finishingCode: 'PAINT' }]), sla + 3)

    const { user: makerUser, profile } = await createManufacturer()
    await new RoleService().assignRole(makerUser, 'manufacturer')
    // the only free day is after the plain SLA but inside SLA + 3
    await createPrinter(profile, {
      slotDate: DateTime.now()
        .plus({ days: sla + 2 })
        .toISODate()!,
    })
    const paint = await FinishingOption.findByOrFail('code', 'PAINT')
    await new FinishingService().setOffered(profile.id, [paint.id])

    const shop = await createStorefrontProduct()
    const { default: OrderService } = await import('#services/orders/order_service')
    const order = await new OrderService().createStorefrontDraft(await buyer(), shop.product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
      finishing: 'PAINT',
      finishingColour: 'Black',
    })
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')
    const offer = await new MatchingService(quiet).start(order.id)
    assert.isNotNull(offer, 'the later slot counts because painting adds days')

    const job = await new MatchingService(quiet).acceptOffer(offer!.id, profile.id)
    const days = Math.round(job.dueAt.diff(job.acceptedAt!, 'days').days)
    assert.equal(days, sla + 3)
  })

  test('painting needs a known colour, in the shop and in the cart', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    const user = await buyer()
    const order = (finishingColour?: string) =>
      client
        .post(`/shop/${shop.product.id}/order`)
        .loginAs(user)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json({
          material: 'PLA',
          quantity: 1,
          shippingAddress: TR_ADDRESS,
          finishing: 'PAINT',
          finishingColour,
        })
    const noColour = await order()
    noColour.assertStatus(422)
    assert.match(noColour.body().error, /Choose a colour/)
    const unknown = await order('Chartreuse')
    unknown.assertStatus(422)
    assert.lengthOf(await Order.query().where('buyerId', user.id), 0)

    // a finishing without a colour ignores one that was sent
    const sanded = await client
      .post(`/shop/${shop.product.id}/order`)
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        material: 'PLA',
        quantity: 1,
        shippingAddress: TR_ADDRESS,
        finishing: 'SAND',
        finishingColour: 'Red',
      })
    sanded.assertStatus(302)
    const [placed] = await Order.query().where('buyerId', user.id).preload('items')
    assert.isNull(placed.items[0].finishingColour)

    const file = await createAnalyzedFile(user)
    const cart = await client
      .post('/cart/items')
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ modelFileId: file.id, material: 'PLA', quantity: 1, finishing: 'PAINT' })
    cart.assertStatus(422)
  })
})
