import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import OrderTransformer from '#transformers/order_transformer'
import ProductionJob from '#models/production_job'
import Order from '#models/order'
import { createDraftOrder, createManufacturer } from '#tests/helpers/order_fixtures'

async function fixture() {
  const { order, buyer } = await createDraftOrder()
  const maker = await createManufacturer()
  await ProductionJob.create({
    orderId: order.id,
    manufacturerProfileId: maker.profile.id,
    status: 'shipped',
    acceptedAt: DateTime.now(),
    dueAt: DateTime.now().plus({ days: 5 }),
    shippedAt: DateTime.now(),
    carrier: 'Yurtici',
    trackingNumber: 'YK123',
  })
  const loaded = await Order.query()
    .where('id', order.id)
    .preload('items', (q) => q.preload('modelFile'))
    .preload('productionJobs', (q) => q.preload('manufacturerProfile'))
    .firstOrFail()
  return { order: loaded, buyer, maker }
}

type Variant = 'toObject' | 'forOffer' | 'forManufacturer' | 'forAdmin'

async function render(order: Order, variant: Variant) {
  const item = OrderTransformer.transform(order).useVariant(variant)
  return (await item.resolve(app.container.createResolver(), 0)) as Record<string, unknown>
}

function keysDeep(value: unknown, acc: string[] = []): string[] {
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      acc.push(k)
      keysDeep(v, acc)
    }
  }
  return acc
}

test.group('OrderTransformer anonymity', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('buyer/seller variant never exposes the manufacturer', async ({ assert }) => {
    const { order, maker } = await fixture()
    const out = await render(order, 'toObject')
    const json = JSON.stringify(out)

    for (const key of keysDeep(out)) assert.notMatch(key, /manufacturer|maker|printer/i)
    assert.notInclude(json, maker.profile.publicAlias)
    assert.notInclude(json, maker.user.email)
    // shipment tracking is fine to share
    assert.include(json, 'YK123')
  })

  test('offer variant reveals nothing about the buyer', async ({ assert }) => {
    const { order, buyer } = await fixture()
    const out = await render(order, 'forOffer')
    const json = JSON.stringify(out)

    assert.notInclude(json, buyer.email)
    assert.notInclude(json, 'Ali Veli')
    assert.notInclude(json, 'Test Sk.')
    for (const key of keysDeep(out)) {
      assert.notMatch(key, /buyer|seller|email|phone|address|shipTo|total|subtotal/i)
    }
  })

  test('manufacturer variant has shipping fields only — no email, phone or buyer prices', async ({
    assert,
  }) => {
    const { order, buyer } = await fixture()
    const out = await render(order, 'forManufacturer')
    const json = JSON.stringify(out)

    assert.deepInclude(out.shipTo as object, { fullName: 'Ali Veli', city: 'Istanbul' })
    assert.notInclude(json, buyer.email)
    assert.notInclude(json, '+905551112233')
    for (const key of keysDeep(out)) {
      assert.notMatch(key, /buyerId|sellerId|email|phone|totalMinor|subtotalMinor|unitCost/i)
    }
  })

  test('admin variant shows the manufacturer alias', async ({ assert }) => {
    const { order, maker } = await fixture()
    const out = await render(order, 'forAdmin')
    const job = out.productionJob as Record<string, unknown>
    assert.equal(job.manufacturerAlias, maker.profile.publicAlias)
  })
})
