import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Order from '#models/order'
import Payout from '#models/payout'
import DisputeService, { DisputeError } from '#services/disputes/dispute_service'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import {
  createFundedOrder,
  createUser,
  orderPaymentStatus,
  orderStatus,
} from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

const ledger = new LedgerService()

function services() {
  const provider = new FakePaymentProvider()
  const payments = new PaymentService(provider, async () => {})
  const payouts = new PayoutService(provider)
  return { provider, payouts, disputes: new DisputeService(payments, payouts) }
}

test.group('DisputeService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('open: only the buyer, only when delivered, needs a real reason; blocks payout', async ({
    assert,
  }) => {
    const { provider, payouts, disputes } = services()
    const stranger = await createUser('stranger')
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })

    await assert.rejects(
      () => disputes.open(order.id, stranger.id, 'this is broken!!'),
      DisputeError as never
    )
    await assert.rejects(() => disputes.open(order.id, buyer.id, 'bad'), DisputeError as never)

    const dispute = await disputes.open(order.id, buyer.id, 'The part arrived cracked in two')
    assert.equal(dispute.status, 'open')
    assert.equal(await orderStatus(order.id), 'disputed')
    await assert.rejects(() => payouts.release(order.id), /dispute is open|completed/)

    // second dispute on the same order is impossible (order is no longer delivered)
    await assert.rejects(
      () => disputes.open(order.id, buyer.id, 'still cracked, again'),
      DisputeError as never
    )
  })

  test('cannot dispute before delivery or after completion or after the window', async ({
    assert,
  }) => {
    const { provider, disputes } = services()
    const shipped = await createFundedOrder(provider, { upTo: 'shipped' })
    await assert.rejects(
      () => disputes.open(shipped.order.id, shipped.buyer.id, 'not here yet at all'),
      DisputeError as never
    )

    const completed = await createFundedOrder(provider, { upTo: 'completed' })
    await assert.rejects(
      () => disputes.open(completed.order.id, completed.buyer.id, 'changed my mind now'),
      DisputeError as never
    )

    const late = await createFundedOrder(provider, { upTo: 'delivered' })
    await Order.query()
      .where('id', late.order.id)
      .update({
        delivered_at: DateTime.now().minus({ days: 30 }).toSQL(),
      })
    await assert.rejects(
      () => disputes.open(late.order.id, late.buyer.id, 'this is far too late'),
      /window/
    )
  })

  test('evidence and response: participants only, files scoped to the dispute', async ({
    assert,
  }) => {
    const { provider, disputes } = services()
    const stranger = await createUser('stranger')
    const { order, buyer, makerUser, profile } = await createFundedOrder(provider, {
      upTo: 'delivered',
    })
    const dispute = await disputes.open(order.id, buyer.id, 'The part arrived cracked in two')

    const ev = await disputes.addEvidence(dispute.id, buyer.id, {
      storageKey: `disputes/${dispute.id}/crack.jpg`,
      note: 'photo',
    })
    assert.equal(ev.uploaderId, buyer.id)
    await disputes.addEvidence(dispute.id, makerUser.id, {
      storageKey: `disputes/${dispute.id}/ok.jpg`,
    })

    await assert.rejects(
      () =>
        disputes.addEvidence(dispute.id, stranger.id, {
          storageKey: `disputes/${dispute.id}/x.jpg`,
        }),
      DisputeError as never
    )
    await assert.rejects(
      () => disputes.addEvidence(dispute.id, buyer.id, { storageKey: 'models/other.stl' }),
      /Invalid evidence/
    )

    const responded = await disputes.respond(dispute.id, profile.id, 'It shipped intact, see photo')
    assert.equal(responded.status, 'responded')
    await assert.rejects(
      () => disputes.respond(dispute.id, uid(999), 'not mine to answer'),
      DisputeError as never
    )
  })

  test('full refund: buyer gets everything back, nobody is paid, ledger nets to zero', async ({
    assert,
  }) => {
    const { provider, disputes } = services()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const dispute = await disputes.open(order.id, buyer.id, 'The part arrived cracked in two')
    const admin = await createUser('admin')

    const resolved = await disputes.resolve(dispute.id, admin.id, {
      resolution: 'full_refund',
      note: 'photos clear',
    })

    assert.equal(resolved.status, 'resolved')
    assert.equal(resolved.refundMinor, order.totalMinor)
    assert.equal(await orderStatus(order.id), 'resolved')
    assert.lengthOf(provider.refunds, 1)
    assert.equal(provider.refunds[0].amountMinor, order.totalMinor)
    assert.equal(await orderPaymentStatus(order.id), 'refunded')
    // nothing was earned on it: no platform-fee invoice, now or from the hourly sweep
    const { default: InvoiceService } = await import('#services/invoicing/invoice_service')
    const invoices = new InvoiceService()
    assert.isNull(await invoices.issueFor(order.id))
    await invoices.issueDue()
    const { default: Invoice } = await import('#models/invoice')
    assert.lengthOf(await Invoice.query().where('orderId', order.id), 0)
    assert.lengthOf(await Payout.query().where('orderId', order.id), 0)
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    assert.equal(await ledger.balance('provider_cash', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('partial refund comes out of the manufacturer share; the rest is paid out', async ({
    assert,
  }) => {
    const { provider, disputes } = services()
    const seller = await createUser('seller')
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered', seller })
    const dispute = await disputes.open(order.id, buyer.id, 'One of two parts is damaged')
    const admin = await createUser('admin')

    await disputes.resolve(dispute.id, admin.id, {
      resolution: 'partial_refund',
      refundMinor: 1_000,
    })

    assert.equal(provider.refunds[0].amountMinor, 1_000)
    const payouts = await Payout.query().where('orderId', order.id)
    const maker = payouts.find((p) => p.beneficiaryType === 'manufacturer')!
    const sell = payouts.find((p) => p.beneficiaryType === 'seller')!
    assert.equal(sell.amountMinor, order.sellerShareMinor)
    assert.equal(
      maker.amountMinor,
      order.totalMinor - order.platformFeeMinor - order.sellerShareMinor - 1_000
    )
    assert.isTrue(payouts.every((p) => p.status === 'paid'))
    assert.equal(
      await ledger.balance('provider_cash', { orderId: order.id }),
      order.platformFeeMinor
    )
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('partial refund must be positive and no larger than the manufacturer share', async ({
    assert,
  }) => {
    const { provider, disputes } = services()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const dispute = await disputes.open(order.id, buyer.id, 'One of two parts is damaged')
    const admin = await createUser('admin')

    for (const refundMinor of [0, -5, 1.5, order.totalMinor]) {
      await assert.rejects(
        () => disputes.resolve(dispute.id, admin.id, { resolution: 'partial_refund', refundMinor }),
        DisputeError as never
      )
    }
    assert.equal(await orderStatus(order.id), 'disputed')
    assert.lengthOf(provider.refunds, 0)
  })

  test('release (no fault): manufacturer paid in full, no refund', async ({ assert }) => {
    const { provider, disputes } = services()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const dispute = await disputes.open(order.id, buyer.id, 'I think it is the wrong colour')
    const admin = await createUser('admin')

    await disputes.resolve(dispute.id, admin.id, { resolution: 'release' })

    assert.lengthOf(provider.refunds, 0)
    const [payout] = await Payout.query().where('orderId', order.id)
    assert.equal(payout.amountMinor, order.totalMinor - order.platformFeeMinor)
    assert.equal(payout.status, 'paid')
    assert.equal(await orderStatus(order.id), 'resolved')
  })

  test('a resolved dispute cannot be resolved again (no double refund)', async ({ assert }) => {
    const { provider, disputes } = services()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const dispute = await disputes.open(order.id, buyer.id, 'The part arrived cracked in two')
    const admin = await createUser('admin')

    await disputes.resolve(dispute.id, admin.id, { resolution: 'full_refund' })
    await assert.rejects(
      () => disputes.resolve(dispute.id, admin.id, { resolution: 'full_refund' }),
      /already resolved/
    )
    assert.lengthOf(provider.refunds, 1)
  })

  test('refund provider failure: decision stands, debt stays in ledger and is settled later', async ({
    assert,
  }) => {
    const { provider, disputes } = services()
    const payments = new PaymentService(provider, async () => {})
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const dispute = await disputes.open(order.id, buyer.id, 'The part arrived cracked in two')
    const admin = await createUser('admin')

    provider.failRefunds = true
    const resolved = await disputes.resolve(dispute.id, admin.id, { resolution: 'full_refund' })
    assert.equal(resolved.status, 'resolved')
    assert.equal(await ledger.balance('refund', { orderId: order.id }), order.totalMinor)

    provider.failRefunds = false
    assert.equal(await payments.settleRefunds(order.id), order.totalMinor)
    assert.equal(await ledger.balance('refund', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance(), 0)
  })
})
