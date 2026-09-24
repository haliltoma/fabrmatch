/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import Coupon from '#models/coupon'
import Order from '#models/order'
import Referral from '#models/referral'
import User from '#models/user'
import FulfillmentService from '#services/orders/fulfillment_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import ReferralService, {
  normalizeReferralCode,
  REFERRAL_CODE,
} from '#services/growth/referral_service'
import CouponService, { CouponError } from '#services/pricing/coupon_service'
import {
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const flags = fabrmatchConfig.flags as Record<string, number>
const cfg = fabrmatchConfig.referral
const service = new ReferralService()

/** A paid, delivered order whose buyer is already invited by `referrer`; completing it triggers the reward. */
async function deliveredOrderOfInvitee(referrer: User) {
  const provider = new FakePaymentProvider()
  const funded = await createFundedOrder(provider, { upTo: 'delivered' })
  const code = await service.codeFor(referrer)
  await service.attach(funded.buyer, code)
  return funded
}

test.group('referral codes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a code is created once, is hard to misread and unique per member', async ({ assert }) => {
    const a = await createUser('a')
    const b = await createUser('b')
    const first = await service.codeFor(a)
    assert.match(first, REFERRAL_CODE)
    assert.equal(await service.codeFor(a), first)
    assert.notEqual(await service.codeFor(b), first)
    assert.notMatch(first, /[01OI]/)
  })

  test('only well-formed codes are accepted from a link', ({ assert }) => {
    assert.equal(normalizeReferralCode(' abcd2345 '), 'ABCD2345')
    for (const bad of ['', 'short', 'ABCD23456', 'ABCD-234', 'ABCDEFG1', null, undefined, 42]) {
      assert.isNull(normalizeReferralCode(bad))
    }
  })
})

test.group('referral signup', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => {
    flags.referrals = 0
  })

  test('nothing happens while the program is off', async ({ assert }) => {
    const referrer = await createUser('referrer')
    const code = await service.codeFor(referrer)
    const friend = await createUser('friend')
    assert.isNull(await service.attach(friend, code))
    assert.lengthOf(await Referral.all(), 0)
    assert.lengthOf(await Coupon.all(), 0)
  })

  test('a friend gets a personal first-order coupon and is linked to the inviter', async ({
    assert,
  }) => {
    flags.referrals = 1
    const referrer = await createUser('referrer')
    const friend = await createUser('friend')
    const gift = await service.attach(friend, await service.codeFor(referrer))

    assert.isNotNull(gift)
    assert.match(gift!.code, /^INV-[A-Z2-9]{8}$/)
    assert.equal(gift!.userId, friend.id)
    assert.equal(gift!.kind, 'fixed')
    assert.equal(gift!.value, cfg.rewardMinor)
    assert.equal(gift!.maxRedemptions, 1)
    assert.isTrue(gift!.firstOrderOnly)
    assert.isTrue(gift!.endsAt! > DateTime.now().plus({ days: cfg.couponDays - 1 }))

    const link = await Referral.firstOrFail()
    assert.equal(link.referrerId, referrer.id)
    assert.equal(link.refereeId, friend.id)
    assert.equal(link.status, 'pending')
  })

  test('own code, unknown code, a suspended inviter and a second invite are all ignored', async ({
    assert,
  }) => {
    flags.referrals = 1
    const referrer = await createUser('referrer')
    const code = await service.codeFor(referrer)
    assert.isNull(await service.attach(referrer, code)) // own code
    const friend = await createUser('friend')
    assert.isNull(await service.attach(friend, 'ZZZZ2222')) // unknown
    assert.isNull(await service.attach(friend, 'not a code'))

    await User.query().where('id', referrer.id).update({ suspendedAt: DateTime.now().toSQL() })
    assert.isNull(await service.attach(friend, code))
    await User.query().where('id', referrer.id).update({ suspendedAt: null })

    assert.isNotNull(await service.attach(friend, code))
    const other = await createUser('other')
    assert.isNull(await service.attach(friend, await service.codeFor(other))) // one inviter only
    assert.lengthOf(await Referral.all(), 1)
  })

  test('a personal coupon is invisible to everyone but its owner', async ({ assert }) => {
    flags.referrals = 1
    const friend = await createUser('friend')
    const stranger = await createUser('stranger')
    const gift = await service.attach(friend, await service.codeFor(await createUser('referrer')))
    const coupons = new CouponService()
    assert.equal((await coupons.resolve(gift!.code, friend)).id, gift!.id)
    await assert.rejects(() => coupons.resolve(gift!.code, stranger), CouponError)
  })
})

test.group('referral reward', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.setup(() => {
    flags.referrals = 1
    cfg.minOrderMinor = 100
    cfg.maxRewards = 10
  })
  group.each.teardown(() => {
    flags.referrals = 0
    cfg.minOrderMinor = 15_000
    cfg.maxRewards = 10
    cfg.rewardMinor = 5000
  })

  test('the inviter earns a coupon once the friend’s order is completed, and only once', async ({
    assert,
  }) => {
    const referrer = await createUser('referrer')
    const { order, buyer } = await deliveredOrderOfInvitee(referrer)
    assert.equal((await Referral.firstOrFail()).status, 'pending') // nothing before completion

    await new FulfillmentService().completeByBuyer(order.id, buyer.id)
    const link = await Referral.firstOrFail()
    assert.equal(link.status, 'rewarded')
    assert.isNotNull(link.rewardedAt)
    const reward = await Coupon.findOrFail(link.referrerCouponId!)
    assert.equal(reward.userId, referrer.id)
    assert.equal(reward.value, cfg.rewardMinor)
    assert.isFalse(reward.firstOrderOnly)
    assert.lengthOf(await AuditLog.query().where('action', 'referral.rewarded'), 1)

    // a later completed order of the same friend pays nothing more
    const before = await Coupon.query().where('userId', referrer.id)
    await service.rewardSafelyFor(order)
    assert.lengthOf(await Coupon.query().where('userId', referrer.id), before.length)
  })

  test('an order below the minimum, or a sample order, does not count yet', async ({ assert }) => {
    cfg.minOrderMinor = 100_000_000
    const referrer = await createUser('referrer')
    const { order, buyer } = await deliveredOrderOfInvitee(referrer)
    await new FulfillmentService().completeByBuyer(order.id, buyer.id)
    assert.equal((await Referral.firstOrFail()).status, 'pending')

    cfg.minOrderMinor = 100
    await Order.query().where('id', order.id).update({ channel: 'sample' })
    await service.rewardSafelyFor(await Order.findOrFail(order.id))
    assert.equal((await Referral.firstOrFail()).status, 'pending')
  })

  test('an unverified or suspended inviter is not rewarded', async ({ assert }) => {
    const referrer = await createUser('referrer', { verified: false })
    const { order, buyer } = await deliveredOrderOfInvitee(referrer)
    await new FulfillmentService().completeByBuyer(order.id, buyer.id)
    const link = await Referral.firstOrFail()
    assert.equal(link.status, 'rejected')
    assert.equal(link.rejectReason, 'referrer_not_eligible')
    assert.isNull(link.referrerCouponId)
  })

  test('one member can only earn a limited number of rewards', async ({ assert }) => {
    cfg.maxRewards = 1
    const referrer = await createUser('referrer')
    const first = await deliveredOrderOfInvitee(referrer)
    await new FulfillmentService().completeByBuyer(first.order.id, first.buyer.id)
    const second = await deliveredOrderOfInvitee(referrer)
    await new FulfillmentService().completeByBuyer(second.order.id, second.buyer.id)

    const links = await Referral.query().orderBy('id', 'asc')
    assert.deepEqual(
      links.map((l) => [l.status, l.rejectReason]),
      [
        ['rewarded', null],
        ['rejected', 'limit_reached'],
      ]
    )
  })

  test('a problem while rewarding never undoes the order completion', async ({ assert }) => {
    const referrer = await createUser('referrer')
    const { order, buyer } = await deliveredOrderOfInvitee(referrer)
    const link = await Referral.firstOrFail()
    cfg.rewardMinor = 0 // makes creating the reward coupon fail
    await new FulfillmentService().completeByBuyer(order.id, buyer.id)
    assert.equal((await Order.findOrFail(order.id)).status, 'completed')
    assert.equal((await Referral.findOrFail(link.id)).status, 'pending')
  })

  test('the account summary shows the code, the counts and the member’s coupons', async ({
    assert,
  }) => {
    const referrer = await createUser('referrer')
    const { order, buyer } = await deliveredOrderOfInvitee(referrer)
    await new FulfillmentService().completeByBuyer(order.id, buyer.id)
    const summary = await service.summary(referrer)
    assert.equal(summary.invited, 1)
    assert.equal(summary.rewarded, 1)
    assert.lengthOf(summary.coupons, 1)
    assert.equal(summary.coupons[0].valueMinor, cfg.rewardMinor)
    assert.isFalse(summary.coupons[0].expired)
  })
})
