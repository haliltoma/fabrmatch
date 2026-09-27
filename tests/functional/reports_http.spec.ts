/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PayoutService from '#services/payments/payout_service'
import {
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function admin() {
  const user = await createUser('admin')
  await new RoleService().assignRole(user, 'admin')
  return user
}

test.group('reports over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('admin sees the month and downloads CSV files; others cannot', async ({
    client,
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order } = await createFundedOrder(provider, { upTo: 'completed', seller })
    await new PayoutService(provider).release(order.id)
    const boss = await admin()

    const page = await client.get('/admin/reports').headers(inertia).loginAs(boss)
    page.assertStatus(200)
    assert.equal(page.body().props.rows[0].ordersCompleted, 1)

    for (const kind of [
      'summary',
      'orders',
      'payouts',
      'vat',
      'purchase-invoices',
      'withholding',
    ]) {
      const file = await client.get(`/admin/reports/download/${kind}`).loginAs(boss)
      file.assertStatus(200)
      assert.include(file.header('content-type') ?? '', 'text/csv')
      assert.match(
        file.header('content-disposition') ?? '',
        new RegExp(`fabrmatch-${kind}-\\d{4}-\\d{2}\\.csv`)
      )
    }
    ;(await client.get('/admin/reports/download/secrets').loginAs(boss)).assertStatus(404)
    ;(
      await client.get('/admin/reports?month=2026-13').headers(inertia).loginAs(boss).redirects(0)
    ).assertStatus(422)

    const member = await createUser('member')
    await new RoleService().assignRole(member, 'seller')
    ;(await client.get('/admin/reports').loginAs(member)).assertStatus(403)
    ;(await client.get('/admin/reports/download/orders').loginAs(member)).assertStatus(403)
  })

  test('a maker and a seller download only their own payouts', async ({ client, assert }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')
    const mine = await createFundedOrder(provider, { upTo: 'completed', seller })
    const other = await createFundedOrder(provider, { upTo: 'completed' })
    const payouts = new PayoutService(provider)
    await payouts.release(mine.order.id)
    await payouts.release(other.order.id)

    await new RoleService().assignRole(mine.makerUser, 'manufacturer')
    const maker = await client.get('/maker/earnings/statement.csv').loginAs(mine.makerUser)
    maker.assertStatus(200)
    assert.include(maker.text(), mine.order.code)
    assert.notInclude(maker.text(), other.order.code)

    const sales = await client.get('/seller/statement.csv').loginAs(seller)
    sales.assertStatus(200)
    assert.include(sales.text(), mine.order.code)
    assert.notInclude(sales.text(), other.order.code)

    const stranger = await createUser('stranger')
    await new RoleService().assignRole(stranger, 'seller')
    const empty = await client.get('/seller/statement.csv').loginAs(stranger)
    assert.notInclude(empty.text(), mine.order.code)
  })
})
