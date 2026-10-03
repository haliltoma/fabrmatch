import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import MatchOffer from '#models/match_offer'
import ModerationEvent from '#models/moderation_event'
import Notification from '#models/notification'
import OfferRevision from '#models/offer_revision'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OfferRevisionService, {
  MAX_REVISIONS,
  RevisionError,
} from '#services/matching/offer_revision_service'
import { ModerationError } from '#services/messaging/content_moderator'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  offerStatus,
} from '#tests/helpers/order_fixtures'

const quiet: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

/** A paid order offered to one maker, with two colours chosen by the buyer. */
async function offered() {
  const maker = await createManufacturer()
  await createPrinter(maker.profile, { colors: ['black'] })
  const { order, buyer } = await createDraftOrder(undefined, {
    colours: [
      { name: 'Red', part: 'head' },
      { name: 'Blue', part: 'body' },
    ],
  })
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  const matching = new MatchingService(quiet, () => 0.99)
  const offer = await matching.start(order.id)
  const [item] = await OrderItem.query().where('orderId', order.id)
  return { order, buyer, maker, offer: offer!, item, matching }
}

test.group('OfferRevisionService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const service = new OfferRevisionService()

  test('a maker without the colours in stock still gets the offer and can ask', async ({
    assert,
  }) => {
    const { offer, maker, order } = await offered()
    assert.equal(offer.manufacturerProfileId, maker.profile.id)

    const revision = await service.request(
      offer.id,
      maker.profile.id,
      'I have no clear blue. May the body be white?',
      maker.user.id
    )
    assert.equal(revision.status, 'open')
    const waiting = await MatchOffer.findOrFail(offer.id)
    assert.equal(waiting.status, 'revision')
    assert.closeTo(
      waiting.expiresAt.diffNow('minutes').minutes,
      fabrmatchConfig.matching.revisionTtlMinutes,
      1
    )

    const note = await Notification.query()
      .where('userId', order.buyerId)
      .where('type', 'revision_requested')
      .firstOrFail()
    assert.notInclude(JSON.stringify(note), maker.profile.publicAlias, 'the buyer never learns who')
    assert.exists(await AuditLog.findBy('action', 'match.revision_requested'))
  })

  test('the buyer changes colours (same count, same price) and the offer goes back', async ({
    assert,
  }) => {
    const { offer, maker, order, buyer, item } = await offered()
    await service.request(offer.id, maker.profile.id, 'Body white instead?', maker.user.id)
    const before = await Order.findOrFail(order.id)

    await service.answer(order.id, buyer.id, {
      response: 'Yes, white body is fine.',
      items: [
        {
          itemId: item.id,
          colours: [
            { name: 'red', part: 'head' },
            { name: 'White', part: 'body' },
          ],
          buyerNote: 'Thanks!',
        },
      ],
    })

    const changed = await OrderItem.findOrFail(item.id)
    assert.deepEqual(changed.colours, [
      { name: 'Red', part: 'head' },
      { name: 'White', part: 'body' },
    ])
    assert.equal(changed.color, 'red')
    assert.equal(changed.buyerNote, 'Thanks!')
    assert.equal(changed.colourExtraMinor, item.colourExtraMinor, 'price untouched')
    const after = await Order.findOrFail(order.id)
    assert.equal(after.totalMinor, before.totalMinor)

    const back = await MatchOffer.findOrFail(offer.id)
    assert.equal(back.status, 'pending')
    const [revision] = await service.forOffer(offer.id)
    assert.equal(revision.status, 'answered')
    assert.equal(revision.response, 'Yes, white body is fine.')
    assert.exists(
      await Notification.query()
        .where('userId', maker.user.id)
        .where('type', 'revision_answered')
        .first()
    )

    // now it is the maker's call again
    const job = await new MatchingService(quiet).acceptOffer(offer.id, maker.profile.id)
    assert.equal(job.orderId, order.id)
  })

  test('a priced change is refused: the colour count stays', async ({ assert }) => {
    const { offer, maker, order, buyer, item } = await offered()
    await service.request(offer.id, maker.profile.id, 'One colour only?', maker.user.id)
    await assert.rejects(
      () =>
        service.answer(order.id, buyer.id, {
          response: 'ok, all red',
          items: [{ itemId: item.id, colours: [{ name: 'Red' }] }],
        }),
      /Cancel for a full refund/
    )
    assert.equal(await offerStatus(offer.id), 'revision', 'nothing changed')
  })

  test('contact details or a company name in either text are refused and logged', async ({
    assert,
  }) => {
    const { offer, maker, order, buyer } = await offered()
    await assert.rejects(
      () =>
        service.request(offer.id, maker.profile.id, 'WhatsApp me 0532 111 22 33', maker.user.id),
      ModerationError
    )
    assert.equal(await offerStatus(offer.id), 'pending', 'no revision opened')

    await service.request(offer.id, maker.profile.id, 'White body?', maker.user.id)
    await assert.rejects(
      () => service.answer(order.id, buyer.id, { response: 'see www.myshop.com' }),
      ModerationError
    )
    const events = await ModerationEvent.query().orderBy('createdAt', 'asc')
    assert.deepEqual(
      events.map((e) => [e.context, e.userId]),
      [
        ['revision_request', maker.user.id],
        ['revision_response', buyer.id],
      ]
    )
  })

  test('while waiting the maker cannot accept but may decline', async ({ assert }) => {
    const { offer, maker, matching } = await offered()
    await service.request(offer.id, maker.profile.id, 'White body?', maker.user.id)
    await assert.rejects(
      () => matching.acceptOffer(offer.id, maker.profile.id),
      /Waiting for the buyer/
    )
    await matching.declineOffer(offer.id, maker.profile.id)
    assert.equal(await offerStatus(offer.id), 'declined')
    const [closed] = await OfferRevision.query().where('matchOfferId', offer.id)
    assert.equal(closed.status, 'lapsed')
  })

  test('a maker asks at most three times; strangers see nothing', async ({ assert }) => {
    const { offer, maker, order, buyer } = await offered()
    for (let i = 0; i < MAX_REVISIONS; i++) {
      await service.request(offer.id, maker.profile.id, `Question ${i + 1}?`, maker.user.id)
      await service.answer(order.id, buyer.id, { response: `Answer ${i + 1}` })
    }
    await assert.rejects(
      () => service.request(offer.id, maker.profile.id, 'One more?', maker.user.id),
      RevisionError
    )
    assert.lengthOf(await service.forOffer(offer.id), MAX_REVISIONS)

    const other = await createManufacturer()
    await assert.rejects(
      () => service.request(offer.id, other.profile.id, 'hi', other.user.id),
      /not found/
    )
    await assert.rejects(
      () => service.answer(order.id, maker.user.id, { response: 'x' }),
      /not found/
    )
  })

  test('no answer in time: the question lapses and the next maker is tried', async ({ assert }) => {
    const { offer, maker, order, buyer, matching } = await offered()
    const second = await createManufacturer()
    await createPrinter(second.profile)
    await service.request(offer.id, maker.profile.id, 'White body?', maker.user.id)
    await MatchOffer.query()
      .where('id', offer.id)
      .update({
        expiresAt: DateTime.now().minus({ minutes: 1 }).toSQL(),
      })

    await assert.rejects(() => service.answer(order.id, buyer.id, { response: 'yes' }), /run out/)
    const next = await matching.expireOffer(offer.id)
    assert.equal(await offerStatus(offer.id), 'expired')
    const [lapsed] = await OfferRevision.query().where('matchOfferId', offer.id)
    assert.equal(lapsed.status, 'lapsed')
    assert.equal(next?.manufacturerProfileId, second.profile.id)
    assert.isNull(await service.openForOrder(order.id))
  })

  test('cancelling while a question is open refunds and closes it', async ({ assert }) => {
    const { offer, maker, order, buyer } = await offered()
    await service.request(offer.id, maker.profile.id, 'White body?', maker.user.id)
    const open = await service.openForOrder(order.id)
    assert.equal(open?.history[0].request, 'White body?')

    await new OrderService().cancelWithRefund(order.id, { actorId: buyer.id, by: 'buyer' })
    assert.equal(await offerStatus(offer.id), 'expired')
    const [closed] = await OfferRevision.query().where('matchOfferId', offer.id)
    assert.equal(closed.status, 'lapsed')
  })
})
