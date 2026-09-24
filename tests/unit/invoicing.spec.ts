import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Invoice from '#models/invoice'
import FakeInvoiceProvider from '#services/invoicing/fake_provider'
import InvoiceService from '#services/invoicing/invoice_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import { createFundedOrder, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

test.group('invoicing (R1-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a completed order gets one commission invoice with exact amounts, once', async ({
    assert,
  }) => {
    const provider = new FakeInvoiceProvider()
    const service = new InvoiceService(provider)
    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'completed' })

    const first = await service.issueFor(order.id)
    const again = await service.issueFor(order.id)
    assert.exists(first)
    assert.equal(again?.id, first?.id)
    assert.match(first!.number, /^FM-\d{4}-\d{6}$/)
    assert.equal(first!.grossMinor, order.platformFeeMinor)
    assert.equal(first!.netMinor + first!.taxMinor, first!.grossMinor)
    assert.equal(first!.recipientUserId, order.buyerId)
    assert.lengthOf(provider.issued, 1)
    assert.equal(first!.providerRef, `fake_inv_${first!.number}`)
  })

  test('numbers are gapless and increase; orders that are not finished get none', async ({
    assert,
  }) => {
    const service = new InvoiceService(new FakeInvoiceProvider())
    const a = await createFundedOrder(new FakePaymentProvider(), { upTo: 'completed' })
    const b = await createFundedOrder(new FakePaymentProvider(), { upTo: 'completed' })
    const running = await createFundedOrder(new FakePaymentProvider(), { upTo: 'in_production' })

    const one = await service.issueFor(a.order.id)
    const two = await service.issueFor(b.order.id)
    assert.isNull(await service.issueFor(running.order.id))
    const n = (i: Invoice | null) => Number(i!.number.split('-')[2])
    assert.equal(n(two) - n(one), 1)
  })

  test('a provider outage keeps the invoice locally and the sweep hands it over later', async ({
    assert,
  }) => {
    const provider = new FakeInvoiceProvider()
    const service = new InvoiceService(provider)
    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'completed' })

    provider.failNext = true
    const invoice = await service.issueFor(order.id)
    assert.isNotOk(invoice!.providerRef)

    const swept = await service.issueDue()
    assert.equal(swept.resent, 1)
    await invoice!.refresh()
    assert.isNotNull(invoice!.providerRef)
    assert.deepEqual(await service.issueDue(), { issued: 0, resent: 0 })
  })

  test('the sweep issues invoices for completed orders that have none', async ({ assert }) => {
    const service = new InvoiceService(new FakeInvoiceProvider())
    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'completed' })
    const swept = await service.issueDue()
    assert.isAtLeast(swept.issued, 1)
    assert.exists(await Invoice.query().where('orderId', order.id).first())
  })

  test('only the recipient can open the printable invoice', async ({ assert }) => {
    const service = new InvoiceService(new FakeInvoiceProvider())
    const { order, buyer, makerUser } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'completed',
    })
    const invoice = await service.issueFor(order.id)
    const html = await service.htmlFor(invoice!.id, buyer.id)
    assert.include(html!, invoice!.number)
    assert.isNull(await service.htmlFor(invoice!.id, makerUser.id))
  })
})
