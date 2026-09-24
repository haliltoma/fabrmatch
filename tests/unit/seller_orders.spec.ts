import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import OrderTransformer from '#transformers/order_transformer'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

async function placeSale(
  sellerProduct: Awaited<ReturnType<typeof createStorefrontProduct>>,
  advance = true
) {
  const buyer = await createUser('buyer')
  const order = await new OrderService().createStorefrontDraft(buyer, sellerProduct.product.id, {
    material: 'PLA',
    quantity: 2,
    shippingAddress: TR_ADDRESS,
  })
  if (advance) {
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment', { actorId: buyer.id })
    await sm.transition(order.id, 'paid', { actorId: buyer.id })
  }
  return order
}

test.group('OrderService.listForSeller', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists only this seller’s paid-or-later orders, newest first', async ({ assert }) => {
    const mine = await createStorefrontProduct()
    const theirs = await createStorefrontProduct({ title: 'Other Shop Item' })

    const a = await placeSale(mine)
    const b = await placeSale(mine)
    await placeSale(mine, false) // draft: hidden
    await placeSale(theirs)

    const { rows, meta } = await new OrderService().listForSeller(mine.sellerUser.id)

    assert.deepEqual(
      rows.map((o) => o.id),
      [b.id, a.id]
    )
    assert.equal(meta.total, 2)
    assert.isTrue(rows.every((o) => o.sellerId === mine.sellerUser.id))
  })

  test('status filter narrows the list', async ({ assert }) => {
    const shop = await createStorefrontProduct()
    const paid = await placeSale(shop)
    const cancelled = await placeSale(shop)
    await new OrderStateMachine().transition(cancelled.id, 'matching')
    await new OrderStateMachine().transition(cancelled.id, 'unmatched')
    await new OrderStateMachine().transition(cancelled.id, 'cancelled')

    const onlyCancelled = await new OrderService().listForSeller(shop.sellerUser.id, {
      status: 'cancelled',
    })
    assert.deepEqual(
      onlyCancelled.rows.map((o) => o.id),
      [cancelled.id]
    )
    assert.notInclude(
      onlyCancelled.rows.map((o) => o.id),
      paid.id
    )
  })

  test('seller variant exposes earnings only: no buyer or manufacturer data', async ({
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const order = await placeSale(shop)
    const { rows } = await new OrderService().listForSeller(shop.sellerUser.id)
    const out = await OrderTransformer.transform(rows[0])
      .useVariant('forSeller')
      .resolve(app.container.createResolver(), 0)

    assert.equal(out.earnMinor, order.sellerShareMinor)
    assert.isAbove(out.earnMinor, 0)
    const json = JSON.stringify(out)
    for (const forbidden of [
      'buyer',
      'manufacturer',
      'alias',
      'shipTo',
      'shippingAddress',
      'email',
      'phone',
      'fullName',
      'Ali Veli',
      'fileName',
    ]) {
      assert.notInclude(json, forbidden)
    }
  })
})
