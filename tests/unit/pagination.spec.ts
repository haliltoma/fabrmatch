import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { MAX_PER_PAGE, pageMeta, pageParams } from '#services/pagination'
import OrderService from '#services/orders/order_service'
import { createDraftOrder, createUser } from '#tests/helpers/order_fixtures'

test.group('pageParams', () => {
  test('defaults and clamps untrusted input', ({ assert }) => {
    assert.deepEqual(pageParams(), { page: 1, perPage: 20 })
    assert.deepEqual(pageParams({ page: '3', perPage: '10' }), { page: 3, perPage: 10 })
    for (const bad of [0, -4, 1.5, 'abc', null, undefined, Number.NaN]) {
      assert.equal(pageParams({ page: bad }).page, 1)
      assert.equal(pageParams({ perPage: bad }).perPage, 20)
    }
    assert.equal(pageParams({ perPage: 9999 }).perPage, MAX_PER_PAGE)
  })

  test('pageMeta never reports fewer than 1 page', ({ assert }) => {
    assert.deepEqual(pageMeta(0, 1, 20), { page: 1, perPage: 20, total: 0, pages: 1 })
    assert.equal(pageMeta(41, 1, 20).pages, 3)
    assert.equal(pageMeta(40, 1, 20).pages, 2)
  })
})

test.group('paginated lists', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('buyer orders: newest first, sliced by page, other buyers excluded', async ({ assert }) => {
    const buyer = await createUser('buyer')
    for (let i = 0; i < 5; i++) await createDraftOrder(buyer)
    await createDraftOrder()

    const service = new OrderService()
    const first = await service.listForBuyer(buyer.id, { page: 1, perPage: 2 })
    const last = await service.listForBuyer(buyer.id, { page: 3, perPage: 2 })

    assert.lengthOf(first.rows, 2)
    assert.lengthOf(last.rows, 1)
    assert.deepEqual(first.meta, { page: 1, perPage: 2, total: 5, pages: 3 })
    assert.isAbove(first.rows[0].id, first.rows[1].id)
    assert.isTrue(first.rows.every((o) => o.buyerId === buyer.id))
  })

  test('page beyond the end returns no rows, not an error', async ({ assert }) => {
    const buyer = await createUser('buyer')
    await createDraftOrder(buyer)
    const result = await new OrderService().listForBuyer(buyer.id, { page: 9, perPage: 20 })
    assert.lengthOf(result.rows, 0)
    assert.equal(result.meta.total, 1)
  })
})
