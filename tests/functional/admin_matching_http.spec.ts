import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import MatchOffer from '#models/match_offer'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import MatchSuggestionService from '#services/matching/match_suggestion_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import { setPaymentProvider } from '#services/payments/provider_registry'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

const quiet: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

async function admin() {
  const user = await createUser('admin')
  await new RoleService().assignRole(user, 'admin')
  return user
}

async function maker() {
  const { user, profile } = await createManufacturer()
  await new RoleService().assignRole(user, 'manufacturer')
  await createPrinter(profile)
  return profile
}

/** A paid order, with the payment going through the real path into `matching`. */
async function paidOrder() {
  const provider = new FakePaymentProvider('admin-matching')
  setPaymentProvider(provider)
  const { order, buyer } = await createDraftOrder()
  await new PaymentService(provider, (id) => new MatchingService(quiet).start(id)).simulateSuccess(
    order.id,
    buyer.id
  )
  return Order.findOrFail(order.id)
}

test.group('admin matching (manual mode)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    fabrmatchConfig.matching.autoOffer = 0
    return () => {
      fabrmatchConfig.matching.autoOffer = 1
      setPaymentProvider(null)
    }
  })

  test('a paid order waits for the admin: no offer goes out on its own', async ({ assert }) => {
    await maker()
    const order = await paidOrder()
    assert.equal(order.status, 'matching')
    assert.lengthOf(await MatchOffer.query().where('orderId', order.id), 0)

    const queue = await new MatchSuggestionService().queue()
    assert.equal(queue.find((q) => q.id === order.id)?.state, 'needs_maker')
  })

  test('suggestions list only eligible makers, best score first, with the parts', async ({
    assert,
  }) => {
    const a = await maker()
    const b = await maker()
    const order = await paidOrder()

    const view = await new MatchSuggestionService().forOrder(order.id)
    assert.isTrue(view.canOffer)
    assert.sameMembers(
      view.suggestions.map((s) => s.manufacturerProfileId),
      [a.id, b.id]
    )
    const [first, second] = view.suggestions
    assert.isAtLeast(first.score, second.score)
    const p = first.parts
    assert.closeTo(
      first.score,
      0.35 * p.quality + 0.25 * p.onTime + 0.2 * p.distance + 0.2 * p.load,
      1e-9
    )
  })

  test('the admin sends the offer to the maker they picked', async ({ client, assert }) => {
    const picked = await maker()
    await maker()
    const order = await paidOrder()
    const user = await admin()

    const response = await client
      .post(`/admin/matching/${order.id}/offer`)
      .withCsrfToken()
      .loginAs(user)
      .headers(inertia)
      .redirects(0)
      .json({ manufacturerProfileId: picked.id })
    response.assertHeader('location', `/admin/matching/${order.id}`)

    const offers = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(offers, 1)
    assert.equal(offers[0].manufacturerProfileId, picked.id)
    assert.equal(offers[0].status, 'pending')

    // a second offer while one is out is refused
    await client
      .post(`/admin/matching/${order.id}/offer`)
      .withCsrfToken()
      .loginAs(user)
      .headers(inertia)
      .json({ manufacturerProfileId: picked.id })
    const again = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(again, 1)
  })

  test('a decline brings the order back to the admin instead of the next maker', async ({
    assert,
  }) => {
    const picked = await maker()
    await maker()
    const order = await paidOrder()
    const user = await admin()
    const matching = new MatchingService(quiet)

    const offer = await matching.offerTo(order.id, picked.id, user.id)
    await matching.declineOffer(offer.id, picked.id)

    const offers = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(offers, 1)
    const view = await new MatchSuggestionService().forOrder(order.id)
    assert.isTrue(view.canOffer)
    assert.notInclude(
      view.suggestions.map((s) => s.manufacturerProfileId),
      picked.id
    )
  })

  test('a maker who does not fit cannot be picked', async ({ assert }) => {
    await maker()
    const order = await paidOrder()
    const user = await admin()
    const { profile: noPrinter } = await createManufacturer()

    await assert.rejects(
      () => new MatchingService(quiet).offerTo(order.id, noPrinter.id, user.id),
      'This maker is no longer eligible for the order'
    )
  })

  test('the buyer never shows up as a suggestion for their own order', async ({ assert }) => {
    await maker()
    const order = await paidOrder()
    const buyerAsMaker = await createManufacturer()
    buyerAsMaker.profile.userId = order.buyerId
    await buyerAsMaker.profile.save()
    await createPrinter(buyerAsMaker.profile)

    const view = await new MatchSuggestionService().forOrder(order.id)
    assert.notInclude(
      view.suggestions.map((s) => s.manufacturerProfileId),
      buyerAsMaker.profile.id
    )
  })

  test('switching to automatic sends offers for the waiting orders', async ({ client, assert }) => {
    await maker()
    const order = await paidOrder()
    const user = await admin()

    await client
      .post('/admin/matching/mode')
      .withCsrfToken()
      .loginAs(user)
      .headers(inertia)
      .json({ auto: true })
    assert.equal(fabrmatchConfig.matching.autoOffer, 1)
    assert.lengthOf(await MatchOffer.query().where('orderId', order.id), 1)
  })

  test('manual mode: the admin can pick a maker who misses rules; they can still accept', async ({
    client,
    assert,
  }) => {
    await maker()
    const order = await paidOrder()
    const user = await admin()
    const { user: busyUser, profile: busy } = await createManufacturer()
    await new RoleService().assignRole(busyUser, 'manufacturer')
    await createPrinter(busy, { slotMinutes: 0 })

    const view = await new MatchSuggestionService().forOrder(order.id)
    assert.isTrue(view.canOverride)
    const verdict = view.notEligible.find((v) => v.manufacturerProfileId === busy.id)!
    assert.isFalse(verdict.blocked)
    assert.include(
      verdict.printers.flatMap((p) => p.reasons.map((r) => r.code)),
      'no_capacity'
    )

    await client
      .post(`/admin/matching/${order.id}/offer`)
      .withCsrfToken()
      .loginAs(user)
      .headers(inertia)
      .json({ manufacturerProfileId: busy.id })
    const offer = await MatchOffer.query().where('orderId', order.id).firstOrFail()
    assert.equal(offer.manufacturerProfileId, busy.id)
    assert.isTrue(offer.adminOverride)

    const log = await AuditLog.query()
      .where('action', 'match.offer_created')
      .where('subjectId', order.id)
      .firstOrFail()
    assert.include((log.meta as { unmetRules: string[] }).unmetRules, 'no_capacity')

    // no free hours on file, but the override lets the maker take it
    await new MatchingService(quiet).acceptOffer(offer.id, busy.id)
    const accepted = await Order.findOrFail(order.id)
    assert.equal(accepted.status, 'in_production')
  })

  test('automatic mode keeps the rules: a maker who misses one cannot be picked', async ({
    assert,
  }) => {
    await maker()
    const order = await paidOrder()
    const user = await admin()
    const { profile: busy } = await createManufacturer()
    await createPrinter(busy, { slotMinutes: 0 })

    fabrmatchConfig.matching.autoOffer = 1
    const view = await new MatchSuggestionService().forOrder(order.id)
    assert.isFalse(view.canOverride)
    await assert.rejects(
      () => new MatchingService(quiet).offerTo(order.id, busy.id, user.id),
      'This maker is no longer eligible for the order'
    )
  })

  test('even in manual mode nobody makes their own order', async ({ assert }) => {
    const order = await paidOrder()
    const user = await admin()
    const own = await createManufacturer()
    own.profile.userId = order.buyerId
    await own.profile.save()
    await createPrinter(own.profile)

    const view = await new MatchSuggestionService().forOrder(order.id)
    assert.isTrue(view.notEligible.find((v) => v.manufacturerProfileId === own.profile.id)!.blocked)
    await assert.rejects(
      () =>
        new MatchingService(quiet).offerTo(order.id, own.profile.id, user.id, {
          allowOverride: true,
        }),
      /cannot take the order/
    )
    assert.lengthOf(await MatchOffer.query().where('orderId', order.id), 0)
  })

  test('the matching pages are admin only', async ({ client }) => {
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')
    const denied = await client.get('/admin/matching').loginAs(seller)
    denied.assertStatus(403)

    const page = await client
      .get('/admin/matching')
      .loginAs(await admin())
      .headers(inertia)
    page.assertStatus(200)
    page.assertBodyContains({ component: 'admin/matching/index', props: { autoOffer: false } })
  })
})
