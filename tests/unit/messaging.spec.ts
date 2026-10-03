import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Notification from '#models/notification'
import ModerationEvent from '#models/moderation_event'
import OrderMessage from '#models/order_message'
import { ModerationError } from '#services/messaging/content_moderator'
import { maskContactDetails } from '#services/messaging/contact_filter'
import MessageService, { MessageError } from '#services/messaging/message_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import { createFundedOrder, createUser } from '#tests/helpers/order_fixtures'

test.group('contact filter', () => {
  const cases: Array<[string, string]> = [
    ['call me on +90 532 123 45 67 please', 'call me on [hidden] please'],
    ['0532.123.45.67', '[hidden]'],
    ['my number is 05321234567', 'my number is [hidden]'],
    ['mail me: ali.veli@example.com thanks', 'mail me: [hidden] thanks'],
    ['ali [at] example [dot] com', '[hidden]'],
    ['see https://wa.me/905321234567 now', 'see [hidden] now'],
    ['check www.myshop.com/deal', 'check [hidden]'],
    ['pay to TR33 0006 1005 1978 6457 8413 26', 'pay to [hidden]'],
    ['find me @ali_prints', 'find me [hidden]'],
    ['ping me on WhatsApp 555', 'ping me on [hidden]'],
  ]
  for (const [input, expected] of cases) {
    test(`masks: ${input}`, ({ assert }) => {
      const result = maskContactDetails(input)
      assert.equal(result.text, expected)
      assert.isAbove(result.maskedCount, 0)
    })
  }

  test('ordinary talk survives untouched', ({ assert }) => {
    for (const text of [
      'Can the part be 20 mm taller? Layer height 0.2 is fine.',
      'I need 12 pieces by 15.10, PLA in black.',
      'The order code is FO-ABCD1234, thanks!',
      'Print at 60 degrees, 2.5 hours per piece.',
    ]) {
      assert.deepEqual(maskContactDetails(text), { text, maskedCount: 0 })
    }
  })
})

test.group('MessageService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const service = new MessageService()

  async function inProduction() {
    return createFundedOrder(new FakePaymentProvider(), { upTo: 'in_production' })
  }

  test('buyer and maker talk anonymously; contact details never reach the other side', async ({
    assert,
  }) => {
    const { order, buyer, makerUser, profile } = await inProduction()
    await assert.rejects(
      () => service.send(order.id, buyer.id, 'Call me on 0532 123 45 67 or a@b.com'),
      ModerationError
    )
    assert.lengthOf(await OrderMessage.query().where('orderId', order.id), 0, 'refused, not masked')
    await service.send(order.id, buyer.id, 'Could the base be a bit thicker?')
    await service.send(order.id, makerUser.id, 'Sure, will do')

    const buyerView = await service.thread(order.id, 'buyer')
    const makerView = await service.thread(order.id, 'maker')
    assert.deepEqual(
      buyerView.map((m) => [m.from, m.mine]),
      [
        ['Buyer', true],
        ['Maker', false],
      ]
    )
    for (const view of [buyerView, makerView]) {
      const json = JSON.stringify(view)
      assert.notInclude(json, '0532')
      assert.notInclude(json, 'a@b.com')
      assert.notInclude(json, profile.publicAlias)
      assert.notInclude(json, buyer.email)
      assert.notInclude(json, makerUser.email)
    }
  })

  test('only the two parties may write, only while production runs', async ({ assert }) => {
    const { order, buyer, makerUser } = await inProduction()
    const stranger = await createUser('stranger')
    await assert.rejects(() => service.send(order.id, stranger.id, 'hi'), /not found/)
    assert.isNull(await service.sideOf(order.id, stranger.id))
    assert.equal(await service.sideOf(order.id, buyer.id), 'buyer')
    assert.equal(await service.sideOf(order.id, makerUser.id), 'maker')

    await assert.rejects(() => service.send(order.id, buyer.id, '   '), MessageError)
    await assert.rejects(() => service.send(order.id, buyer.id, 'x'.repeat(1501)), /1500/)

    const early = await createFundedOrder(new FakePaymentProvider(), { upTo: 'paid' })
    await assert.rejects(
      () => service.send(early.order.id, early.buyer.id, 'hello'),
      /once production starts/
    )
  })

  test('opening the thread marks the other side’s messages read', async ({ assert }) => {
    const { order, buyer, makerUser } = await inProduction()
    await service.send(order.id, makerUser.id, 'Started printing')
    assert.equal(await service.unreadFor(order.id, 'buyer'), 1)
    assert.equal(await service.unreadFor(order.id, 'maker'), 0)
    await service.thread(order.id, 'buyer')
    assert.equal(await service.unreadFor(order.id, 'buyer'), 0)
    await service.send(order.id, buyer.id, 'Thanks')
    assert.equal(await service.unreadFor(order.id, 'maker'), 1)
  })

  test('a refused attempt is kept encrypted for admins; recipients are notified anonymously', async ({
    assert,
  }) => {
    const { order, buyer, makerUser } = await inProduction()
    await assert.rejects(() => service.send(order.id, buyer.id, 'reach me at +905321234567'))
    const attempt = await ModerationEvent.query().where('userId', buyer.id).firstOrFail()
    assert.equal(attempt.orderId, order.id)
    assert.equal(attempt.context, 'order_message')
    assert.equal(attempt.reason, 'contact')
    assert.notInclude(attempt.textEnc, '905321234567')

    await service.send(order.id, buyer.id, 'Thanks, looking forward to it')
    const note = await Notification.query()
      .where('userId', makerUser.id)
      .where('type', 'message_received')
      .firstOrFail()
    assert.equal((note.data as { link?: string }).link, `/maker/orders/${order.id}/messages`)
    assert.notInclude(JSON.stringify(note), buyer.email)
  })
})
