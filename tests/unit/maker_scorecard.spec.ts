import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import MatchOffer from '#models/match_offer'
import ProductionJob from '#models/production_job'
import MakerScorecardService from '#services/manufacturing/maker_scorecard_service'
import EarningsService from '#services/payments/earnings_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PayoutService from '#services/payments/payout_service'
import { createFundedOrder } from '#tests/helpers/order_fixtures'

test.group('MakerScorecardService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a brand-new maker has empty numbers and a path to tier 1', async ({ assert }) => {
    const { profile } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'paid' })
    const card = await new MakerScorecardService().forProfile(profile)
    assert.equal(card.completedJobs, 0)
    assert.isNull(card.avgRating)
    assert.isNull(card.offerAcceptRate)
    assert.equal(card.nextTier?.tier, 1)
    const jobs = card.nextTier!.requirements.find((r) => r.label === 'Delivered jobs')!
    assert.deepInclude(jobs, { current: 0, target: 5, met: false })
  })

  test('accept rate and average accept time come from real offers', async ({ assert }) => {
    const { order, profile } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'in_production',
    })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    const base = {
      orderId: order.id,
      manufacturerProfileId: profile.id,
      printerId: job.printerId,
      slotDate: DateTime.now(),
      score: 0.5,
      isExploration: false,
      expiresAt: DateTime.now().plus({ minutes: 30 }),
    }
    const created = DateTime.now().minus({ minutes: 30 })
    await MatchOffer.create({
      ...base,
      round: 1,
      status: 'accepted',
      createdAt: created,
      respondedAt: created.plus({ minutes: 10 }),
    })
    await MatchOffer.create({ ...base, round: 2, status: 'expired', createdAt: created })

    const card = await new MakerScorecardService().forProfile(profile)
    assert.equal(card.offerAcceptRate, 0.5)
    assert.equal(card.avgAcceptMinutes, 10)
  })

  test('tier 2 makers have no automatic next tier', async ({ assert }) => {
    const { profile } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'paid' })
    profile.trustTier = 2
    const card = await new MakerScorecardService().forProfile(profile)
    assert.isNull(card.nextTier)
  })
})

test.group('EarningsService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists a maker’s payouts with totals and no buyer information', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order, profile, buyer } = await createFundedOrder(provider, { upTo: 'completed' })
    await new PayoutService(provider).release(order.id)

    const earnings = new EarningsService()
    const totals = await earnings.summary('manufacturer', profile.id)
    assert.lengthOf(totals, 1)
    assert.isAbove(totals[0].paidMinor, 0)
    assert.equal(totals[0].pendingMinor, 0)
    assert.equal(totals[0].paidThisMonthMinor, totals[0].paidMinor)

    const { rows, meta } = await earnings.list('manufacturer', profile.id)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].orderCode, order.code)
    assert.equal(rows[0].status, 'paid')
    assert.equal(meta.total, 1)
    const json = JSON.stringify(rows)
    assert.notInclude(json, buyer.email)
    assert.notInclude(json, 'Ali Veli')

    const other = await earnings.list('manufacturer', profile.id + 999)
    assert.lengthOf(other.rows, 0)
  })
})
