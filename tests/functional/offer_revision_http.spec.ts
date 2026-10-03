import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderItem from '#models/order_item'
import RoleService from '#services/identity/role_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  offerStatus,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const quiet: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

test.group('offer revisions over HTTP (Paket Y)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('maker asks on the board, buyer answers on the order page, nobody is named', async ({
    client,
    assert,
  }) => {
    const maker = await createManufacturer()
    await createPrinter(maker.profile)
    await new RoleService().assignRole(maker.user, 'manufacturer')
    const { order, buyer } = await createDraftOrder(undefined, {
      colours: [
        { name: 'Red', part: 'head' },
        { name: 'Blue', part: 'body' },
      ],
      buyerNote: 'Gift, please pack well',
    })
    await new RoleService().assignRole(buyer, 'seller')
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')
    const offer = await new MatchingService(quiet, () => 0.99).start(order.id)

    // the maker sees the colours, the parts and the note on the offer
    const board = await client.get('/maker/work').loginAs(maker.user).headers(inertia)
    board.assertStatus(200)
    const card = board.body().props.offers[0]
    assert.deepEqual(card.order.items[0].colours, [
      { name: 'Red', part: 'head' },
      { name: 'Blue', part: 'body' },
    ])
    assert.equal(card.order.items[0].noteForMaker, 'Gift, please pack well')
    assert.isTrue(card.canAskRevision)

    const leak = await client
      .post(`/maker/offers/${offer!.id}/revision`)
      .loginAs(maker.user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ body: 'Our shop is on instagram @atlas3d' })
    leak.assertStatus(422)

    const ask = await client
      .post(`/maker/offers/${offer!.id}/revision`)
      .loginAs(maker.user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ body: 'No blue PLA here, may the body be white?' })
    ask.assertStatus(302)
    assert.equal(await offerStatus(offer!.id), 'revision')

    const page = await client.get(`/orders/${order.id}`).loginAs(buyer).headers(inertia)
    page.assertStatus(200)
    const { revision } = page.body().props
    assert.equal(revision.history[0].request, 'No blue PLA here, may the body be white?')
    assert.includeMembers(
      revision.colours.map((c: { name: string }) => c.name),
      ['White', 'Blue']
    )
    assert.notInclude(JSON.stringify(page.body().props), maker.profile.publicAlias)
    assert.notInclude(JSON.stringify(page.body().props), maker.user.email)

    const [item] = await OrderItem.query().where('orderId', order.id)
    const answer = await client
      .post(`/orders/${order.id}/revision`)
      .loginAs(buyer)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        response: 'White is fine',
        items: [
          {
            itemId: item.id,
            colours: [
              { name: 'Red', part: 'head' },
              { name: 'White', part: 'body' },
            ],
          },
        ],
      })
    answer.assertStatus(302)
    assert.equal(await offerStatus(offer!.id), 'pending')

    const again = await client.get('/maker/work').loginAs(maker.user).headers(inertia)
    const updated = again.body().props.offers[0]
    assert.equal(updated.revisions[0].response, 'White is fine')
    assert.equal(updated.order.items[0].colours[1].name, 'White')
    assert.notInclude(JSON.stringify(updated), buyer.email)

    // another buyer cannot answer for this order
    const stranger = await createManufacturer()
    await new RoleService().assignRole(stranger.user, 'seller')
    const denied = await client
      .post(`/orders/${order.id}/revision`)
      .loginAs(stranger.user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ response: 'hi' })
    denied.assertStatus(422)
  })
})
