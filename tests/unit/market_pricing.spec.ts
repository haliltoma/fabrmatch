import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Order from '#models/order'
import Payout from '#models/payout'
import EligibilityService from '#services/matching/eligibility_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import MakerCostProfileService from '#services/manufacturing/maker_cost_profile_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import { covering } from '#services/pricing/maker_budget'
import { orderFloor, orderWorkLines, marketMakers } from '#services/pricing/maker_market'
import { createDraftOrder, createManufacturer, createPrinter } from '#tests/helpers/order_fixtures'

const quiet: MatchingEffects = {
  async offerCreated() {},
  async offerAccepted() {},
  async orderUnmatched() {},
}

/** Four makers who differ only in their machine hour: the dearest is far above the rest. */
async function fourMakers() {
  const service = new MakerCostProfileService()
  const list = []
  for (const hourly of [1000, 1500, 2000, 9000]) {
    const m = await createManufacturer()
    const printer = await createPrinter(m.profile)
    await service.save(m.profile.id, {
      hourlyRateMinor: hourly,
      setupMinor: 0,
      wasteBps: 1000,
      failureBps: 500,
      profitBps: 2500,
    })
    list.push({ ...m, printer, hourly })
  }
  return list
}

async function floorsFor(order: Order) {
  await order.load('items')
  const lines = orderWorkLines({ fxRateNano: order.fxRateNano, items: order.items })
  const market = await marketMakers({ country: 'TR', technology: 'FDM', materials: ['PLA'] })
  return new Map(market.map((m) => [m.manufacturerProfileId, orderFloor(m, lines)!]))
}

test.group('market pricing (Paket V, K-V1/K-V3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the order pays makers what three in four of them ask, and the buyer price follows', async ({
    assert,
  }) => {
    const makers = await fourMakers()
    const { order } = await createDraftOrder()
    const floors = await floorsFor(order)
    const sorted = [...floors.values()].sort((a, b) => a - b)

    assert.isNotNull(order.makerBudgetMinor)
    // the budget is at least the 75 % point and is what the items carry as maker share
    assert.isAtLeast(order.makerBudgetMinor!, covering(sorted, 7500))
    const itemShares = order.items.reduce((a, i) => a + i.manufacturerShareMinor * i.quantity, 0)
    assert.equal(order.makerBudgetMinor, itemShares)
    const fit = makers.filter((m) => floors.get(m.profile.id)! <= order.makerBudgetMinor!)
    assert.lengthOf(fit, 3)
    assert.notInclude(
      fit.map((m) => m.hourly),
      9000
    )
  })

  test('only makers whose own price fits are offered it, each at their own price', async ({
    assert,
  }) => {
    const makers = await fourMakers()
    const { order } = await createDraftOrder()
    const floors = await floorsFor(order)
    const candidates = await new EligibilityService().findCandidates(order)
    const dearest = makers.find((m) => m.hourly === 9000)!
    assert.notInclude(
      candidates.map((c) => c.manufacturerProfileId),
      dearest.profile.id
    )
    for (const c of candidates) assert.equal(c.makerPayMinor, floors.get(c.manufacturerProfileId))
  })

  test('the maker is paid their price plus shipping; the rest is the platform spread', async ({
    assert,
  }) => {
    await fourMakers()
    const provider = new FakePaymentProvider()
    const { order, buyer } = await createDraftOrder()
    await new PaymentService(provider, async () => {}).simulateSuccess(order.id, buyer.id)

    const matching = new MatchingService(quiet, () => 0.99)
    const offer = await matching.start(order.id)
    assert.exists(offer)
    assert.isNotNull(offer!.makerPayMinor)
    await offer!.load('manufacturerProfile')
    const job = await matching.acceptOffer(
      offer!.id,
      offer!.manufacturerProfileId,
      offer!.manufacturerProfile.userId
    )
    assert.equal(job.agreedPayMinor, offer!.makerPayMinor)

    const sm = new OrderStateMachine()
    for (const step of ['shipped', 'delivered', 'completed'] as const) {
      await sm.transition(order.id, step, { actorId: buyer.id })
    }
    await new PayoutService(provider, 'marketplace').release(order.id)

    const fresh = await Order.findOrFail(order.id)
    const payout = await Payout.query()
      .where('orderId', order.id)
      .where('beneficiaryType', 'manufacturer')
      .firstOrFail()
    assert.equal(payout.amountMinor, job.agreedPayMinor! + fresh.shippingMinor)

    const ledger = new LedgerService()
    const spread = await ledger.balance('platform_spread', { orderId: order.id, currency: 'TRY' })
    const makersPart = fresh.totalMinor - fresh.platformFeeMinor
    assert.equal(spread, makersPart - payout.amountMinor)
    assert.isAbove(spread, 0, 'a cheaper maker took an order priced for three in four')
  })
})
