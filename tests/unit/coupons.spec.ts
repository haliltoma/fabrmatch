/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Coupon from '#models/coupon'
import CouponRedemption from '#models/coupon_redemption'
import Order from '#models/order'
import Payout from '#models/payout'
import OrderService from '#services/orders/order_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import ReconciliationService from '#services/payments/reconciliation_service'
import CouponService, { CouponError } from '#services/pricing/coupon_service'
import { splitGross } from '#services/tax/tax'
import {
  TR_ADDRESS,
  createDraftOrder,
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const coupons = new CouponService()

async function coupon(overrides: Partial<Parameters<CouponService['create']>[0]> = {}) {
  return coupons.create({ code: 'WELCOME10', kind: 'percent', value: 1000, ...overrides })
}

test.group('coupon rules', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('codes are validated, normalised and unique', async ({ assert }) => {
    const created = await coupon({ code: ' welcome10 ' })
    assert.equal(created.code, 'WELCOME10')
    await assert.rejects(() => coupon({ code: 'Welcome10' }), CouponError)
    await assert.rejects(() => coupon({ code: 'a b' }), CouponError)
    await assert.rejects(() => coupon({ code: 'X1', value: 1 }), CouponError) // too short
    await assert.rejects(() => coupon({ code: 'BIG', value: 10_001 }), CouponError)
    await assert.rejects(() => coupon({ code: 'ZERO', kind: 'fixed', value: 0 }), CouponError)
  })

  test('unknown, switched-off, not-yet-started and expired codes are refused', async ({
    assert,
  }) => {
    const user = await createUser('buyer')
    await assert.rejects(() => coupons.resolve('NOPE', user), /This code is not valid/)

    const off = await coupon({ code: 'OFFCODE' })
    await coupons.setActive(off.id, false)
    await assert.rejects(() => coupons.resolve('offcode', user), /This code is not valid/)

    await coupon({ code: 'SOON', startsAt: DateTime.now().plus({ days: 1 }) })
    await assert.rejects(() => coupons.resolve('SOON', user), /not active yet/)
    await coupon({ code: 'OLD', endsAt: DateTime.now().minus({ days: 1 }) })
    await assert.rejects(() => coupons.resolve('OLD', user), /expired/)

    await coupon({ code: 'FINE', endsAt: DateTime.now().plus({ days: 1 }) })
    assert.equal((await coupons.resolve('fine', user)).code, 'FINE')
  })

  test('a buyer uses a code once, and the total number of uses is limited', async ({ assert }) => {
    const first = await createUser('buyer')
    const second = await createUser('buyer')
    await coupon({ code: 'ONEONLY', maxRedemptions: 1 })
    const { order } = await createDraftOrder(first, { couponCode: 'ONEONLY' })
    assert.equal(order.discountMinor > 0, true)

    await assert.rejects(() => coupons.resolve('ONEONLY', first), CouponError)
    await assert.rejects(() => coupons.resolve('ONEONLY', second), /used up/)
    const list = await coupons.list()
    assert.equal(list[0].used, 1)
  })

  test('a cancelled order and a long-abandoned draft give the use back', async ({ assert }) => {
    const buyer = await createUser('buyer')
    await coupon({ code: 'RETRY', maxRedemptions: 1 })
    const { order } = await createDraftOrder(buyer, { couponCode: 'RETRY' })
    await assert.rejects(() => coupons.resolve('RETRY', buyer), CouponError)

    await db
      .from('orders')
      .where('id', order.id)
      .update({ created_at: DateTime.now().minus({ hours: 30 }).toSQL() })
    assert.equal((await coupons.resolve('RETRY', buyer)).code, 'RETRY')

    await db.from('orders').where('id', order.id).update({ created_at: DateTime.now().toSQL() })
    await assert.rejects(() => coupons.resolve('RETRY', buyer), CouponError)
    await new OrderService().cancelByBuyer(order.id, buyer.id)
    assert.equal((await coupons.resolve('RETRY', buyer)).code, 'RETRY')
  })

  test('a first-order code is refused once the buyer has a real order', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const newcomer = await createUser('buyer')
    await coupon({ code: 'FIRST', firstOrderOnly: true, perUserLimit: 5 })
    await coupons.resolve('FIRST', newcomer) // drafts do not count

    const { buyer } = await createFundedOrder(provider, { upTo: 'paid' })
    await assert.rejects(() => coupons.resolve('FIRST', buyer), /first order only/)
  })
})

test.group('coupons on orders', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the discount comes out of the platform fee only: total and VAT follow, shares do not', async ({
    assert,
  }) => {
    const buyer = await createUser('buyer')
    const { order: plain } = await createDraftOrder(buyer, { quantity: 3 })
    await coupon({ code: 'TEN', value: 1000 })
    const { order: discounted } = await createDraftOrder(buyer, { quantity: 3, couponCode: 'ten' })

    assert.isAbove(discounted.discountMinor, 0)
    assert.isAtMost(discounted.discountMinor, plain.platformFeeMinor)
    assert.equal(discounted.totalMinor, plain.totalMinor - discounted.discountMinor)
    assert.equal(discounted.platformFeeMinor, plain.platformFeeMinor - discounted.discountMinor)
    assert.equal(discounted.shippingMinor, plain.shippingMinor)
    assert.equal(discounted.subtotalMinor + discounted.shippingMinor, discounted.totalMinor)
    assert.equal(discounted.sellerShareMinor, plain.sellerShareMinor)
    // what the makers get is unchanged: total − fee − seller share
    const makerShare = (o: Order) => o.totalMinor - o.platformFeeMinor - o.sellerShareMinor
    assert.equal(makerShare(discounted), makerShare(plain))
    // VAT is due on what the buyer pays
    assert.equal(
      discounted.taxMinor,
      splitGross(discounted.totalMinor, discounted.taxRateBps).taxMinor
    )
    assert.equal(discounted.baseTotalMinor, discounted.totalMinor)

    const redemption = await CouponRedemption.findByOrFail('orderId', discounted.id)
    assert.equal(redemption.discountMinor, discounted.discountMinor)
    assert.equal(redemption.userId, buyer.id)
  })

  test('a code that would give nothing, or is below its minimum, is refused and reserves nothing', async ({
    assert,
  }) => {
    const buyer = await createUser('buyer')
    await coupon({ code: 'BIGMIN', minOrderMinor: 100_000_000 })
    await assert.rejects(
      () => createDraftOrder(buyer, { couponCode: 'BIGMIN' }),
      /does not apply to this order/
    )
    assert.lengthOf(await CouponRedemption.all(), 0)
    assert.lengthOf(await Order.all(), 0)
  })

  test('a fixed coupon larger than the platform fee is capped at the fee', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const { order: plain } = await createDraftOrder(buyer)
    await coupon({ code: 'HUGE', kind: 'fixed', value: 5_000_000 })
    const { order } = await createDraftOrder(buyer, { couponCode: 'HUGE' })
    assert.equal(order.discountMinor, plain.platformFeeMinor)
    assert.equal(order.platformFeeMinor, 0)
    assert.isAbove(order.totalMinor, order.shippingMinor)
  })

  test('paid and completed: the maker is paid exactly as without a coupon, and the books balance', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    await coupon({ code: 'PAYOUT', value: 1000 })
    const plain = await createFundedOrder(provider, { upTo: 'completed', seller })
    const withCoupon = await createFundedOrder(provider, {
      upTo: 'completed',
      seller,
      couponCode: 'PAYOUT',
    })
    assert.isAbove(withCoupon.order.discountMinor, 0)

    const payout = new PayoutService(provider)
    await payout.release(plain.order.id)
    await payout.release(withCoupon.order.id)
    const makerPay = async (id: number) => {
      const rows = await Payout.query()
        .where('orderId', id)
        .where('beneficiaryType', 'manufacturer')
      return rows.reduce((a, p) => a + p.amountMinor, 0)
    }
    assert.equal(await makerPay(withCoupon.order.id), await makerPay(plain.order.id))
    const ledger = new LedgerService()
    assert.equal(
      await ledger.balance('platform_fee', { orderId: withCoupon.order.id }),
      withCoupon.order.platformFeeMinor
    )
    assert.equal(await ledger.balance('buyer_escrow', { orderId: withCoupon.order.id }), 0)
    assert.deepEqual(await new ReconciliationService().run(), [])
  })

  test('cancelling a discounted order refunds exactly what was paid', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    await coupon({ code: 'REFUND', value: 1000 })
    const { order, buyer } = await createFundedOrder(provider, {
      upTo: 'paid',
      couponCode: 'REFUND',
    })
    assert.isAbove(order.discountMinor, 0)
    const orders = new OrderService(new PaymentService(provider, async () => {}))
    await orders.cancelByBuyer(order.id, buyer.id)
    assert.lengthOf(provider.refunds, 1)
    assert.equal(provider.refunds[0].amountMinor, order.totalMinor)
    assert.equal(await new LedgerService().trialBalance(), 0)
  })

  test('two buyers cannot both take the last use of a coupon', async ({ assert }) => {
    const a = await createUser('buyer')
    const b = await createUser('buyer')
    await coupon({ code: 'LAST', maxRedemptions: 1 })
    await createDraftOrder(a, { couponCode: 'LAST' })
    await assert.rejects(() => createDraftOrder(b, { couponCode: 'LAST' }), /used up/)
    assert.lengthOf(await CouponRedemption.all(), 1)
    assert.equal((await Coupon.findByOrFail('code', 'LAST')).maxRedemptions, 1)
    assert.isDefined(TR_ADDRESS)
  })
})
