import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import FileAccessGrant from '#models/file_access_grant'
import Order from '#models/order'
import Payout from '#models/payout'
import ProductionJob from '#models/production_job'
import DisputeService, { DisputeError } from '#services/disputes/dispute_service'
import MakerStatsService from '#services/manufacturing/maker_stats_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import {
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createUser,
  orderStatus,
} from '#tests/helpers/order_fixtures'

const noEffects: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

function setup() {
  const provider = new FakePaymentProvider()
  const payments = new PaymentService(provider, async () => {})
  const payouts = new PayoutService(provider)
  const matching = new MatchingService(noEffects, () => 0.99)
  const rematchCalls: number[] = []
  const disputes = new DisputeService(payments, payouts, async (id) => {
    rematchCalls.push(id)
    return matching.runRound(id)
  })
  return { provider, payouts, disputes, matching, rematchCalls }
}

test.group('reprint after a dispute (R3-T6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the order goes back to matching, the first job is cancelled, escrow is untouched', async ({
    assert,
  }) => {
    const { provider, disputes, rematchCalls } = setup()
    const admin = await createUser('admin')
    const { order, buyer, profile } = await createFundedOrder(provider, { upTo: 'delivered' })
    const second = await createManufacturer()
    await createPrinter(second.profile)
    const escrowBefore = await new LedgerService().balance('buyer_escrow', { orderId: order.id })

    const dispute = await disputes.open(order.id, buyer.id, 'The part cracked at the corner')
    await disputes.resolve(dispute.id, admin.id, { resolution: 'reproduce', note: 'reprint' })

    assert.equal(await orderStatus(order.id), 'matching')
    assert.deepEqual(rematchCalls, [order.id])
    const firstJob = await ProductionJob.query()
      .where('orderId', order.id)
      .where('manufacturerProfileId', profile.id)
      .firstOrFail()
    assert.equal(firstJob.status, 'cancelled')
    assert.equal(firstJob.cancelReason, 'dispute_reprint')
    assert.equal(
      await new LedgerService().balance('buyer_escrow', { orderId: order.id }),
      escrowBefore
    )
    assert.lengthOf(await Payout.query().where('orderId', order.id), 0, 'nobody is paid yet')
    const fresh = await Order.findOrFail(order.id)
    assert.equal(fresh.matchingRound, 1, 'a new round started for the second maker')
    assert.isNull(fresh.deliveredAt)
  })

  test('the new maker finishes the job and is paid; the first maker is never offered again', async ({
    assert,
  }) => {
    const { provider, disputes, matching, payouts } = setup()
    const admin = await createUser('admin')
    const { order, buyer, profile } = await createFundedOrder(provider, { upTo: 'delivered' })
    const second = await createManufacturer()
    await createPrinter(second.profile)

    const dispute = await disputes.open(order.id, buyer.id, 'The part cracked at the corner')
    await disputes.resolve(dispute.id, admin.id, { resolution: 'reproduce' })

    const offer = await matching.runRound(order.id)
    assert.isNull(offer, 'already an offer is pending or none eligible')
    const pending = await import('#models/match_offer').then((m) =>
      m.default.query().where('orderId', order.id).where('status', 'pending').first()
    )
    assert.equal(pending?.manufacturerProfileId, second.profile.id)
    assert.notEqual(pending?.manufacturerProfileId, profile.id)

    const job = await matching.acceptOffer(pending!.id, second.profile.id)
    assert.equal(job.status, 'accepted')
    assert.equal(await orderStatus(order.id), 'in_production')
    const grants = await FileAccessGrant.query().where('productionJobId', job.id)
    assert.isAbove(grants.length, 0)
    const oldGrants = await FileAccessGrant.query().where('manufacturerProfileId', profile.id)
    assert.isTrue(
      oldGrants.every((g) => g.isExpired),
      'the first maker loses file access'
    )
    assert.isDefined(payouts)
  })

  test('the dispute counts against the first maker even though the job was cancelled', async ({
    assert,
  }) => {
    const { provider, disputes } = setup()
    const admin = await createUser('admin')
    const { order, buyer, profile } = await createFundedOrder(provider, { upTo: 'delivered' })
    const dispute = await disputes.open(order.id, buyer.id, 'The part cracked at the corner')
    await disputes.resolve(dispute.id, admin.id, { resolution: 'reproduce' })

    const stats = await new MakerStatsService().load([profile.id])
    const mine = stats.get(profile.id)!
    assert.equal(mine.disputed, 1)
    assert.equal(mine.total, 1)
  })

  test('only one reprint per order', async ({ assert }) => {
    const { provider, disputes, matching } = setup()
    const admin = await createUser('admin')
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const second = await createManufacturer()
    await createPrinter(second.profile)

    const first = await disputes.open(order.id, buyer.id, 'The part cracked at the corner')
    await disputes.resolve(first.id, admin.id, { resolution: 'reproduce' })
    const offer = await import('#models/match_offer').then((m) =>
      m.default.query().where('orderId', order.id).where('status', 'pending').firstOrFail()
    )
    await matching.acceptOffer(offer.id, second.profile.id)
    // deliver the reprint, then dispute again
    const sm = await import('#services/orders/order_state_machine')
    const machine = new sm.default()
    await machine.transition(order.id, 'shipped')
    await machine.transition(order.id, 'delivered')
    await Order.query().where('id', order.id).update({ delivered_at: new Date() })

    const again = await disputes.open(order.id, buyer.id, 'The second copy is broken as well')
    await assert.rejects(
      () => disputes.resolve(again.id, admin.id, { resolution: 'reproduce' }),
      DisputeError as never
    )
    assert.equal(await orderStatus(order.id), 'disputed', 'the failed decision changed nothing')
    await disputes.resolve(again.id, admin.id, { resolution: 'full_refund' })
    assert.equal(await orderStatus(order.id), 'resolved')
  })
})
