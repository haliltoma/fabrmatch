import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Payout from '#models/payout'
import Dispute from '#models/dispute'
import PayoutService, { PayoutError } from '#services/payments/payout_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import { createFundedOrder, createUser } from '#tests/helpers/order_fixtures'

const ledger = new LedgerService()

test.group('PayoutService (rule 5: escrow release)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('completed order: escrow splits into fee, seller and manufacturer payouts', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order, profile } = await createFundedOrder(provider, { seller })

    const result = await new PayoutService(provider).release(order.id)

    assert.deepEqual(result, { allocated: true, paid: 2, pending: 0 })
    const payouts = await Payout.query().where('orderId', order.id).orderBy('id')
    assert.lengthOf(payouts, 2)
    const maker = payouts.find((p) => p.beneficiaryType === 'manufacturer')!
    const sell = payouts.find((p) => p.beneficiaryType === 'seller')!
    assert.equal(maker.beneficiaryId, profile.id)
    assert.equal(sell.beneficiaryId, seller.id)
    assert.equal(sell.amountMinor, order.sellerShareMinor)
    assert.equal(maker.amountMinor + sell.amountMinor + order.platformFeeMinor, order.totalMinor)
    assert.isTrue(payouts.every((p) => p.status === 'paid' && p.providerRef && p.paidAt))

    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    assert.equal(await ledger.balance('manufacturer_payable', { orderId: order.id }), 0)
    assert.equal(await ledger.balance('seller_payable', { orderId: order.id }), 0)
    assert.equal(
      await ledger.balance('platform_fee', { orderId: order.id }),
      order.platformFeeMinor
    )
    // what stays at the provider is exactly our commission
    assert.equal(
      await ledger.balance('provider_cash', { orderId: order.id }),
      order.platformFeeMinor
    )
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('no seller → only the manufacturer is paid', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order } = await createFundedOrder(provider)
    await new PayoutService(provider).release(order.id)
    const payouts = await Payout.query().where('orderId', order.id)
    assert.lengthOf(payouts, 1)
    assert.equal(payouts[0].beneficiaryType, 'manufacturer')
    assert.equal(payouts[0].amountMinor, order.totalMinor - order.platformFeeMinor)
  })

  test('release is idempotent: second call pays and posts nothing', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order } = await createFundedOrder(provider)
    const service = new PayoutService(provider)
    await service.release(order.id)
    const second = await service.release(order.id)

    assert.deepEqual(second, { allocated: false, paid: 0, pending: 0 })
    assert.lengthOf(provider.approvals, 1)
    assert.equal(
      await ledger.balance('platform_fee', { orderId: order.id }),
      order.platformFeeMinor
    )
  })

  test('not released before the order is completed', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const service = new PayoutService(provider)
    for (const upTo of ['paid', 'in_production', 'shipped', 'delivered'] as const) {
      const { order } = await createFundedOrder(provider, { upTo })
      await assert.rejects(() => service.release(order.id), PayoutError as never)
      assert.lengthOf(await Payout.query().where('orderId', order.id), 0)
      assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    }
    assert.lengthOf(provider.approvals, 0)
  })

  test('not released while a dispute is open', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order, buyer } = await createFundedOrder(provider)
    await Dispute.create({
      orderId: order.id,
      openedBy: buyer.id,
      reason: 'cracked',
      status: 'open',
      refundMinor: 0,
    })
    await assert.rejects(() => new PayoutService(provider).release(order.id), /dispute is open/)
    assert.lengthOf(provider.approvals, 0)
    assert.lengthOf(await Payout.query().where('orderId', order.id), 0)
  })

  test('provider failure leaves payouts pending; retry pays each exactly once', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order } = await createFundedOrder(provider, { seller })
    const service = new PayoutService(provider)

    provider.failApprovals = true
    const failed = await service.release(order.id)
    assert.deepEqual(failed, { allocated: true, paid: 0, pending: 2 })
    // funds are allocated but still payable, nothing left the provider
    assert.isAbove(await ledger.balance('manufacturer_payable', { orderId: order.id }), 0)

    provider.failApprovals = false
    const retry = await service.release(order.id)
    assert.deepEqual(retry, { allocated: false, paid: 2, pending: 0 })
    assert.lengthOf(provider.approvals, 2)
    assert.equal(await ledger.balance('manufacturer_payable', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('sweep releases due orders and skips undisputed-but-incomplete ones', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const service = new PayoutService(provider)
    const { order: done } = await createFundedOrder(provider)
    const { order: shipped } = await createFundedOrder(provider, { upTo: 'shipped' })

    const { released } = await service.releaseDue()

    assert.equal(released, 1)
    assert.lengthOf(await Payout.query().where('orderId', done.id), 1)
    assert.lengthOf(await Payout.query().where('orderId', shipped.id), 0)
  })
})

test.group('PayoutService: verified beneficiary (R0-T2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('payout to an unverified manufacturer stays pending until verified', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order, makerUser } = await createFundedOrder(provider)
    makerUser.emailVerifiedAt = null
    await makerUser.save()

    const service = new PayoutService(provider)
    const first = await service.release(order.id)
    assert.deepEqual(first, { allocated: true, paid: 0, pending: 1 })
    assert.lengthOf(provider.approvals, 0)

    makerUser.emailVerifiedAt = DateTime.now()
    await makerUser.save()
    const second = await service.release(order.id)
    assert.deepEqual(second, { allocated: false, paid: 1, pending: 0 })
    assert.lengthOf(provider.approvals, 1)
  })
})
