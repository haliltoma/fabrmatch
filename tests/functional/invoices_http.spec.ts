import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import FakeInvoiceProvider from '#services/invoicing/fake_provider'
import InvoiceService from '#services/invoicing/invoice_service'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import {
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('my invoices (X-16)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a buyer sees only their own invoices, newest first, with the order code', async ({
    client,
    assert,
  }) => {
    const service = new InvoiceService(new FakeInvoiceProvider())
    const first = await createFundedOrder(new FakePaymentProvider(), { upTo: 'completed' })
    const second = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'completed',
    })
    const mine = await service.issueFor(first.order.id)
    const theirs = await service.issueFor(second.order.id)
    // each funded order has its own buyer: the second invoice must not leak into the list
    assert.notEqual(first.buyer.id, second.buyer.id)
    await new RoleService().assignRole(first.buyer, 'seller')

    const page = await client.get('/invoices').headers(inertia).loginAs(first.buyer)
    page.assertStatus(200)
    const { invoices, meta } = page.body().props
    assert.lengthOf(invoices, 1)
    assert.equal(invoices[0].number, mine!.number)
    assert.equal(invoices[0].orderCode, first.order.code)
    assert.equal(invoices[0].grossMinor, first.order.platformFeeMinor)
    assert.equal(invoices[0].netMinor + invoices[0].taxMinor, invoices[0].grossMinor)
    assert.equal(meta.total, 1)
    assert.notInclude(page.text(), theirs!.number)
  })

  test('an empty history renders, and signed-out visitors are sent to log in', async ({
    client,
    assert,
  }) => {
    const user = await createUser('noinvoice')
    await new RoleService().assignRole(user, 'seller')
    const page = await client.get('/invoices').headers(inertia).loginAs(user)
    page.assertStatus(200)
    assert.deepEqual(page.body().props.invoices, [])

    const anonymous = await client.get('/invoices').redirects(0)
    anonymous.assertStatus(302)
  })
})
