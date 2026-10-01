import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import SellerProfile from '#models/seller_profile'
import BrandingService, { BrandingError } from '#services/fulfillment/branding_service'
import PackingSlipService, { PackingSlipError } from '#services/fulfillment/packing_slip_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import ProductionJob from '#models/production_job'
import {
  TR_ADDRESS,
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'
import { DateTime } from 'luxon'
import { uid } from '#tests/helpers/ids'

const branding = new BrandingService()
const slips = new PackingSlipService()

async function storefrontJob(finish = false) {
  const shop = await createStorefrontProduct()
  const buyer = await createUser('buyer')
  const order = await new OrderService().createStorefrontDraft(buyer, shop.product.id, {
    material: 'PLA',
    quantity: 2,
    shippingAddress: TR_ADDRESS,
  })
  const sm = new OrderStateMachine()
  for (const to of ['awaiting_payment', 'paid', 'matching'] as const) {
    await sm.transition(order.id, to)
  }
  const maker = await createManufacturer()
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
  return { shop, buyer, order, maker, job, finish }
}

test.group('white label packing card (R4-T13)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('brand name and message are cleaned, limited, and can be cleared', async ({ assert }) => {
    const { shop } = await storefrontJob()
    const saved = await branding.save(shop.sellerUser.id, {
      brandName: '  Mavi <b>Atölye</b>  ',
      brandMessage: 'Thanks\nfor\tsupporting us!',
    })
    assert.equal(saved.brandName, 'Mavi b Atölye /b')
    assert.equal(saved.brandMessage, 'Thanks for supporting us!')

    await assert.rejects(() => branding.save(shop.sellerUser.id, { brandName: 'x' }), BrandingError)
    await assert.rejects(
      () => branding.save(shop.sellerUser.id, { brandName: 'Shop', brandMessage: 'y'.repeat(241) }),
      /at most 240/
    )
    await assert.rejects(
      () => branding.save(shop.sellerUser.id, { brandMessage: 'no name' }),
      /brand name/
    )
    await branding.save(shop.sellerUser.id, {})
    assert.deepEqual(await branding.get(shop.sellerUser.id), {
      brandName: null,
      brandMessage: null,
      hasLogo: false,
    })
  })

  test('a storefront parcel carries the seller’s brand — and nothing of ours, the maker’s or prices', async ({
    assert,
  }) => {
    const { shop, buyer, order, maker, job } = await storefrontJob()
    await branding.save(shop.sellerUser.id, {
      brandName: 'Mavi Atölye',
      brandMessage: 'Thanks & enjoy your print!',
    })
    const html = await slips.htmlForJob(job.id, maker.profile.id)

    assert.include(html, '<h1>Mavi Atölye</h1>')
    assert.include(html, 'Thanks &amp; enjoy your print!') // escaped
    assert.include(html, order.code)
    assert.include(html, 'PLA')
    assert.include(html, '× 2')
    assert.include(html, 'Ali Veli') // delivery name only
    for (const forbidden of [
      'Fabrmatch',
      maker.profile.publicAlias,
      maker.user.email,
      buyer.email,
      'TRY',
      String(order.totalMinor),
      'Test Sk',
      '34000',
    ]) {
      assert.notInclude(html, forbidden)
    }
  })

  test('without a brand, or on a non-storefront order, the slip is neutral', async ({ assert }) => {
    const { maker, job } = await storefrontJob()
    const neutral = await slips.htmlForJob(job.id, maker.profile.id)
    assert.include(neutral, 'Thank you for your order')

    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const other = await createFundedOrder(provider, { upTo: 'in_production', seller })
    const direct = await ProductionJob.query().where('orderId', other.order.id).firstOrFail()
    const html = await slips.htmlForJob(direct.id, other.profile.id)
    assert.include(html, 'Thank you for your order')
  })

  test('a maker can only print the card of their own job; cancelled jobs have none', async ({
    assert,
  }) => {
    const { job, maker } = await storefrontJob()
    const stranger = await createManufacturer()
    await assert.rejects(() => slips.htmlForJob(job.id, stranger.profile.id), PackingSlipError)
    await assert.rejects(() => slips.htmlForJob(uid(999999), maker.profile.id), PackingSlipError)
    await ProductionJob.query().where('id', job.id).update({ status: 'cancelled' })
    await assert.rejects(() => slips.htmlForJob(job.id, maker.profile.id), PackingSlipError)
  })

  test('markup in a brand can never become markup on the page', async ({ assert }) => {
    const { shop, maker, job } = await storefrontJob()
    await SellerProfile.query().where('userId', shop.sellerUser.id).update({
      brand_name: '<script>alert(1)</script>',
      brand_message: '"><img src=x onerror=alert(1)>',
    })
    const html = await slips.htmlForJob(job.id, maker.profile.id)
    assert.notInclude(html, '<script>')
    assert.notInclude(html, '<img')
    assert.include(html, '&lt;script&gt;')
  })
})
