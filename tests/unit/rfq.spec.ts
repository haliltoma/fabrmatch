/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import ManufacturerProfile from '#models/manufacturer_profile'
import MatchOffer from '#models/match_offer'
import Notification from '#models/notification'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import Payout from '#models/payout'
import PrinterMaterial from '#models/printer_material'
import Rfq from '#models/rfq'
import RfqBid from '#models/rfq_bid'
import RfqInvite from '#models/rfq_invite'
import type User from '#models/user'
import OnboardingService from '#services/identity/onboarding_service'
import MakerStatsService from '#services/manufacturing/maker_stats_service'
import EligibilityService from '#services/matching/eligibility_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import FulfillmentService from '#services/orders/fulfillment_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import RfqBidService from '#services/rfq/rfq_bid_service'
import RfqService, { MAX_OPEN_RFQS, RfqError } from '#services/rfq/rfq_service'
import { MAX_INVITES } from '#services/rfq/rfq_invite_service'
import { bidsForBuyer } from '#services/rfq/rfq_view'
import { seededRng } from '#services/matching/ranking'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

const rfqs = new RfqService()
const bids = new RfqBidService()

const noEffects: MatchingEffects = {
  async offerCreated() {},
  async offerAccepted() {},
  async orderUnmatched() {},
}

async function corporateBuyer(corporate = true) {
  const user = await createUser('corp')
  await new OnboardingService().createSellerProfile(user, {
    businessName: 'Corp Ltd',
    isCorporate: corporate,
  })
  return user
}

async function maker(options: { tier?: number; country?: string; material?: string } = {}) {
  const { user, profile } = await createManufacturer({
    trustTier: options.tier,
    country: options.country,
  })
  // plenty of free hours: a bulk job needs far more than the default slot
  const printer = await createPrinter(profile, { material: options.material, slotMinutes: 200_000 })
  return { user, profile, printer }
}

async function request(buyer: User, overrides: Record<string, unknown> = {}) {
  const file = await createAnalyzedFile(buyer, 8000)
  return rfqs.create(buyer, {
    modelFileId: file.id,
    title: 'Bracket batch',
    material: 'PLA',
    quantity: 100,
    shipCountry: 'TR',
    bidDays: 3,
    maxLeadDays: 14,
    ...overrides,
  })
}

test.group('opening a request', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('only a corporate seller account can open one', async ({ assert }) => {
    const plain = await corporateBuyer(false)
    const file = await createAnalyzedFile(plain)
    await assert.rejects(
      () =>
        rfqs.create(plain, {
          modelFileId: file.id,
          title: 'Batch',
          material: 'PLA',
          quantity: 10,
          shipCountry: 'TR',
          bidDays: 3,
          maxLeadDays: 10,
        }),
      /corporate/
    )
    const stranger = await createUser('nobody')
    await assert.rejects(() => rfqs.assertCorporate(stranger), RfqError)
  })

  test('the inputs are checked before anything is created', async ({ assert }) => {
    const buyer = await corporateBuyer()
    const other = await createUser('other')
    const foreign = await createAnalyzedFile(other)
    await assert.rejects(() => request(buyer, { quantity: 0 }), /Quantity/)
    await assert.rejects(() => request(buyer, { quantity: 5001 }), /Quantity/)
    await assert.rejects(() => request(buyer, { bidDays: 15 }), /Bids can stay open/)
    await assert.rejects(() => request(buyer, { maxLeadDays: 0 }), /delivery time/)
    await assert.rejects(() => request(buyer, { requiredTrustTier: 3 }), /trust level/)
    await assert.rejects(() => request(buyer, { material: 'UNOBTAINIUM' }), /Unknown material/)
    await assert.rejects(() => request(buyer, { modelFileId: foreign.id }), /not found/)
    assert.lengthOf(await Rfq.all(), 0)
  })

  test('at most ten requests stay open per buyer', async ({ assert }) => {
    const buyer = await corporateBuyer()
    for (let i = 0; i < MAX_OPEN_RFQS; i++) await request(buyer)
    await assert.rejects(() => request(buyer), /at most/)
  })

  test('only makers who could really do the job are invited', async ({ assert }) => {
    const buyer = await corporateBuyer()
    const good = await maker()
    await maker({ country: 'DE' }) // wrong country
    await maker({ material: 'PETG' }) // does not offer PLA
    const lowTier = await maker({ tier: 0 })
    const resin = await createManufacturer()
    await createPrinter(resin.profile, { technology: 'SLA', material: 'RESIN' })
    const tiny = await createManufacturer()
    await createPrinter(tiny.profile, { build: [10, 10, 10] }) // part does not fit

    const rfq = await request(buyer, { requiredTrustTier: 0 })
    const invited = (await RfqInvite.query().where('rfqId', rfq.id)).map(
      (i) => i.manufacturerProfileId
    )
    assert.sameMembers(invited, [good.profile.id, lowTier.profile.id])

    const strict = await request(buyer, { requiredTrustTier: 1 })
    assert.lengthOf(await RfqInvite.query().where('rfqId', strict.id), 0)
  })

  test('the buyer’s own maker profile is never invited', async ({ assert }) => {
    const buyer = await corporateBuyer()
    const own = await createManufacturer()
    await createPrinter(own.profile)
    await ManufacturerProfile.query().where('id', own.profile.id).update({ userId: buyer.id })
    const rfq = await request(buyer)
    assert.lengthOf(await RfqInvite.query().where('rfqId', rfq.id), 0)
  })

  test('the list is capped, and a new maker always gets a place (discovery quota)', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const veterans = []
    for (let i = 0; i < MAX_INVITES + 2; i++) veterans.push(await maker())
    // make the veterans established: one delivered job each, and "new" means none at all
    const cfg = fabrmatchConfig.matching
    const before = cfg.explorationMaxCompletedJobs
    cfg.explorationMaxCompletedJobs = 0
    try {
      for (const v of veterans) {
        await db.table('production_jobs').insert({
          order_id: await createDraftOrderId(buyer),
          manufacturer_profile_id: v.profile.id,
          printer_id: v.printer.id,
          status: 'delivered',
          accepted_at: new Date(),
          due_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
      const newcomer = await maker()
      const stats = await new MakerStatsService().load([
        newcomer.profile.id,
        veterans[0].profile.id,
      ])
      assert.equal(stats.get(veterans[0].profile.id)?.completed, 1)
      assert.isUndefined(stats.get(newcomer.profile.id))

      const rfq = await request(buyer)
      const invites = await RfqInvite.query().where('rfqId', rfq.id)
      assert.isAtMost(invites.length, MAX_INVITES)
      assert.include(
        invites.map((i) => i.manufacturerProfileId),
        newcomer.profile.id
      )
      assert.isTrue(
        invites.find((i) => i.manufacturerProfileId === newcomer.profile.id)!.isExploration
      )
    } finally {
      cfg.explorationMaxCompletedJobs = before
    }
  }).timeout(30_000)

  test('invited makers are told, others are not, and the note has no buyer identity', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const yes = await maker()
    const no = await maker({ country: 'DE' })
    const rfq = await request(buyer)
    const got = await Notification.query().where('userId', yes.user.id)
    assert.lengthOf(got, 1)
    assert.equal(got[0].type, 'rfq_invited')
    assert.include(got[0].body, rfq.code)
    for (const forbidden of [buyer.email, buyer.fullName ?? '@@', 'Corp Ltd']) {
      assert.notInclude(JSON.stringify(got[0]), forbidden)
    }
    assert.lengthOf(await Notification.query().where('userId', no.user.id), 0)
  })
})

async function createDraftOrderId(buyer: User) {
  const { createDraftOrder } = await import('#tests/helpers/order_fixtures')
  const { order } = await createDraftOrder(buyer)
  return order.id
}

test.group('bidding', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('only an invited maker can bid, within the deadline and the requested delivery time', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const invited = await maker()
    const outsider = await maker({ country: 'DE' })
    const rfq = await request(buyer, { maxLeadDays: 10 })

    await assert.rejects(
      () => bids.submit(rfq.id, outsider.profile.id, { unitPriceMinor: 500, leadDays: 5 }),
      /not found/
    )
    await assert.rejects(
      () => bids.submit(rfq.id, invited.profile.id, { unitPriceMinor: 0, leadDays: 5 }),
      /price/
    )
    await assert.rejects(
      () => bids.submit(rfq.id, invited.profile.id, { unitPriceMinor: 500, leadDays: 11 }),
      /within 10 days/
    )
    const bid = await bids.submit(rfq.id, invited.profile.id, { unitPriceMinor: 500, leadDays: 5 })
    assert.equal(bid.status, 'active')

    await Rfq.query()
      .where('id', rfq.id)
      .update({ bidsCloseAt: DateTime.now().minus({ minutes: 1 }).toSQL() })
    await assert.rejects(
      () => bids.submit(rfq.id, invited.profile.id, { unitPriceMinor: 400, leadDays: 5 }),
      /closed/
    )
  })

  test('a second offer replaces the first; the buyer is told once; withdrawing works', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const m = await maker()
    const rfq = await request(buyer)
    await bids.submit(rfq.id, m.profile.id, { unitPriceMinor: 900, leadDays: 7 })
    const again = await bids.submit(rfq.id, m.profile.id, {
      unitPriceMinor: 800,
      leadDays: 6,
      note: 'Can start Monday',
    })
    assert.lengthOf(await RfqBid.query().where('rfqId', rfq.id), 1)
    assert.equal(again.unitPriceMinor, 800)
    assert.equal(again.note, 'Can start Monday')
    assert.lengthOf(
      await Notification.query().where('userId', buyer.id).where('type', 'rfq_bid_received'),
      1
    )

    await bids.withdraw(rfq.id, m.profile.id)
    assert.equal((await RfqBid.findOrFail(again.id)).status, 'withdrawn')
    assert.lengthOf(await bidsForBuyer(rfq), 0)
    const back = await bids.submit(rfq.id, m.profile.id, { unitPriceMinor: 700, leadDays: 5 })
    assert.equal(back.status, 'active')
  })

  test('phone numbers, e-mail addresses and links in a note are hidden', async ({ assert }) => {
    const buyer = await corporateBuyer()
    const m = await maker()
    const rfq = await request(buyer)
    const bid = await bids.submit(rfq.id, m.profile.id, {
      unitPriceMinor: 500,
      leadDays: 5,
      note: 'Call +90 555 111 22 33 or write me@shop.com, see https://shop.example',
    })
    for (const leak of ['555', 'me@shop.com', 'shop.example']) assert.notInclude(bid.note!, leak)
  })

  test('the buyer sees numbered offers with a track record and nothing that names the maker', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const a = await maker()
    const b = await maker()
    const rfq = await request(buyer)
    await bids.submit(rfq.id, a.profile.id, { unitPriceMinor: 900, leadDays: 7 })
    await bids.submit(rfq.id, b.profile.id, { unitPriceMinor: 700, leadDays: 9 })

    const view = await bidsForBuyer(rfq)
    assert.deepEqual(
      view.map((v) => v.label),
      ['Offer 1', 'Offer 2']
    )
    const text = JSON.stringify(view)
    for (const m of [a, b]) {
      const profile = await ManufacturerProfile.findOrFail(m.profile.id)
      for (const forbidden of [
        profile.publicAlias,
        m.user.email,
        m.user.fullName ?? '@@',
        String(profile.id) + '"',
      ]) {
        assert.notInclude(text, forbidden)
      }
    }
    assert.deepEqual(Object.keys(view[0]).sort(), [
      'avgRating',
      'completedJobs',
      'id',
      'label',
      'leadDays',
      'note',
      'status',
      'trustTier',
      'unitPriceMinor',
    ])
  })
})

test.group('choosing a winner', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  async function twoBids() {
    const buyer = await corporateBuyer()
    const cheap = await maker()
    const dear = await maker()
    const rfq = await request(buyer, { quantity: 50 })
    const win = await bids.submit(rfq.id, cheap.profile.id, { unitPriceMinor: 1200, leadDays: 8 })
    const lose = await bids.submit(rfq.id, dear.profile.id, { unitPriceMinor: 1900, leadDays: 5 })
    return { buyer, cheap, dear, rfq, win, lose }
  }

  test('an order is created at the bid price with the platform fee and shipping on top', async ({
    assert,
  }) => {
    const { buyer, rfq, win, lose } = await twoBids()
    const { order } = await rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS)

    assert.equal(order.channel, 'rfq')
    assert.equal(order.status, 'draft')
    assert.equal(order.buyerId, buyer.id)
    assert.isNull(order.sellerId)
    const item = await OrderItem.query().where('orderId', order.id).firstOrFail()
    assert.equal(item.quantity, 50)
    assert.equal(item.manufacturerShareMinor, 1200)

    const commission = Math.ceil((1200 * fabrmatchConfig.pricing.commissionBps) / 10_000)
    assert.equal(order.platformFeeMinor, commission * 50)
    assert.equal(order.sellerShareMinor, 0)
    assert.equal(order.totalMinor, item.unitCostMinor * 50)
    assert.equal(order.subtotalMinor + order.shippingMinor, order.totalMinor)
    assert.equal(order.baseTotalMinor, order.totalMinor)
    assert.isAbove(order.taxMinor, 0)
    // maker keeps exactly their price per unit (plus the parcel, like any order)
    assert.equal(order.totalMinor - order.platformFeeMinor, 1200 * 50 + order.shippingMinor)

    assert.equal((await Rfq.findOrFail(rfq.id)).status, 'awarded')
    assert.equal((await Rfq.findOrFail(rfq.id)).orderId, order.id)
    assert.equal((await RfqBid.findOrFail(win.id)).status, 'won')
    assert.equal((await RfqBid.findOrFail(lose.id)).status, 'lost')
  })

  test('the winner is told; it cannot be decided twice, by another buyer or after cancelling', async ({
    assert,
  }) => {
    const { buyer, cheap, rfq, win, lose } = await twoBids()
    const stranger = await corporateBuyer()
    await assert.rejects(() => rfqs.award(rfq.id, stranger, win.id, TR_ADDRESS), /not found/)
    await assert.rejects(
      () => rfqs.award(rfq.id, buyer, uid(999999), TR_ADDRESS),
      /no longer available/
    )

    await rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS)
    const told = await Notification.query()
      .where('userId', cheap.user.id)
      .where('type', 'rfq_awarded')
    assert.lengthOf(told, 1)
    await assert.rejects(
      () => rfqs.award(rfq.id, buyer, lose.id, TR_ADDRESS),
      /already been decided/
    )
    await assert.rejects(() => rfqs.cancel(rfq.id, buyer.id), /no longer be cancelled/)
    assert.lengthOf(await Order.query().where('channel', 'rfq'), 1)
  })

  test('the delivery address must be in the country the offers were made for', async ({
    assert,
  }) => {
    const { buyer, rfq, win } = await twoBids()
    await assert.rejects(
      () => rfqs.award(rfq.id, buyer, win.id, { ...TR_ADDRESS, country: 'DE' }),
      /must be in TR/
    )
    assert.lengthOf(await Order.query().where('channel', 'rfq'), 0)
  })

  test("an awarded order gets the winning bid's delivery time, not the platform default", async ({
    assert,
  }) => {
    const { buyer, rfq, win } = await twoBids()
    const { order } = await rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS)
    const { productionDaysForOrder } = await import('#services/orders/production_window')
    await order.load('items')
    assert.equal(await productionDaysForOrder(order), win.leadDays)
  })

  test('a withdrawn offer cannot win, and cancelling closes every offer', async ({ assert }) => {
    const { buyer, dear, rfq, win } = await twoBids()
    await bids.withdraw(rfq.id, dear.profile.id)
    const withdrawn = await RfqBid.findByOrFail('manufacturerProfileId', dear.profile.id)
    await assert.rejects(
      () => rfqs.award(rfq.id, buyer, withdrawn.id, TR_ADDRESS),
      /no longer available/
    )
    await rfqs.cancel(rfq.id, buyer.id)
    assert.equal((await Rfq.findOrFail(rfq.id)).status, 'cancelled')
    assert.equal((await RfqBid.findOrFail(win.id)).status, 'lost')
    await assert.rejects(() => rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS))
  })

  test('the order is offered to the winner only — even if their price is above the reference', async ({
    assert,
  }) => {
    const { buyer, cheap, dear, rfq, win } = await twoBids()
    // above the platform reference price, which would normally rule this maker out of matching
    await PrinterMaterial.query()
      .where('printerId', cheap.printer.id)
      .update({ pricePerGramMinor: 9_999 })
    const { order } = await rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS)
    await Order.query().where('id', order.id).update({ status: 'paid' })

    const found = await new EligibilityService().findCandidates(await Order.findOrFail(order.id))
    assert.deepEqual(
      found.map((c) => c.manufacturerProfileId),
      [cheap.profile.id]
    )
    assert.notInclude(
      found.map((c) => c.manufacturerProfileId),
      dear.profile.id
    )
  })

  test('paid → offered to the winner → accepted → completed → paid out at the bid price', async ({
    assert,
  }) => {
    const { buyer, cheap, rfq, win } = await twoBids()
    const { order: draft } = await rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS)
    const provider = new FakePaymentProvider()
    await new PaymentService(provider, async () => {}).simulateSuccess(draft.id, buyer.id)

    const matching = new MatchingService(noEffects, seededRng(1))
    const offer = await matching.runRound(draft.id)
    assert.isNull(offer) // the round only runs once the order is matching
    await matching.start(draft.id).catch(() => null)
    const made = await MatchOffer.query().where('orderId', draft.id)
    assert.lengthOf(made, 1)
    assert.equal(made[0].manufacturerProfileId, cheap.profile.id)

    await matching.acceptOffer(made[0].id, cheap.profile.id)
    const fulfilment = new FulfillmentService()
    const { default: ProductionJob } = await import('#models/production_job')
    const job = await ProductionJob.query().where('orderId', draft.id).firstOrFail()
    await fulfilment.markProduced(job.id, cheap.profile.id, cheap.user.id)
    const { addQcPhoto } = await import('#tests/helpers/order_fixtures')
    await addQcPhoto(job.id)
    await fulfilment.markShipped(
      job.id,
      cheap.profile.id,
      { carrier: 'Yurtiçi', trackingNumber: 'T1' },
      cheap.user.id
    )
    await fulfilment.markDeliveredByBuyer(draft.id, buyer.id)
    await fulfilment.completeByBuyer(draft.id, buyer.id)
    await new PayoutService(provider).release(draft.id)

    const paid = await Payout.query()
      .where('orderId', draft.id)
      .where('beneficiaryType', 'manufacturer')
    const order = await Order.findOrFail(draft.id)
    assert.equal(
      paid.reduce((a, p) => a + p.amountMinor, 0),
      1200 * 50 + order.shippingMinor
    )
    assert.equal(paid[0].beneficiaryId, cheap.profile.id)
  })

  test('if the winner declines, the order is not offered to anyone else', async ({ assert }) => {
    const { buyer, cheap, rfq, win } = await twoBids()
    const { order: draft } = await rfqs.award(rfq.id, buyer, win.id, TR_ADDRESS)
    await new PaymentService(new FakePaymentProvider(), async () => {}).simulateSuccess(
      draft.id,
      buyer.id
    )
    const matching = new MatchingService(noEffects, seededRng(1))
    await matching.start(draft.id)
    const [offer] = await MatchOffer.query().where('orderId', draft.id)
    await matching.declineOffer(offer.id, cheap.profile.id)

    assert.lengthOf(await MatchOffer.query().where('orderId', draft.id), 1)
    assert.equal((await Order.findOrFail(draft.id)).status, 'unmatched')
  })
})

test.group('deadlines', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('bidding closes at the deadline; no offers means the request expires; idempotent', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const m = await maker()
    const withBid = await request(buyer)
    const empty = await request(buyer)
    await bids.submit(withBid.id, m.profile.id, { unitPriceMinor: 500, leadDays: 5 })

    const early = await rfqs.closeDue()
    assert.deepEqual(early, { closed: 0, expired: 0 })

    const later = DateTime.now().plus({ days: 4 })
    assert.deepEqual(await rfqs.closeDue(later), { closed: 1, expired: 1 })
    assert.equal((await Rfq.findOrFail(withBid.id)).status, 'closed')
    assert.equal((await Rfq.findOrFail(empty.id)).status, 'expired')
    assert.deepEqual(await rfqs.closeDue(later), { closed: 0, expired: 0 })

    // a closed request can still be decided by the buyer
    const bid = await RfqBid.query().where('rfqId', withBid.id).firstOrFail()
    const { order } = await rfqs.award(withBid.id, buyer, bid.id, TR_ADDRESS)
    assert.equal(order.channel, 'rfq')
  })

  test('a request nobody was chosen for expires after the grace period and its offers close', async ({
    assert,
  }) => {
    const buyer = await corporateBuyer()
    const m = await maker()
    const rfq = await request(buyer)
    const bid = await bids.submit(rfq.id, m.profile.id, { unitPriceMinor: 500, leadDays: 5 })
    await rfqs.closeDue(DateTime.now().plus({ days: 4 }))
    assert.equal((await Rfq.findOrFail(rfq.id)).status, 'closed')

    await rfqs.closeDue(DateTime.now().plus({ days: 30 }))
    assert.equal((await Rfq.findOrFail(rfq.id)).status, 'expired')
    assert.equal((await RfqBid.findOrFail(bid.id)).status, 'lost')
  })
})
