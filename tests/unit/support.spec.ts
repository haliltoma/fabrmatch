import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import SupportService, { SupportError } from '#services/support/support_service'
import { createUser } from '#tests/helpers/order_fixtures'

test.group('support requests (R5-T8)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const service = new SupportService()

  test('a request needs a valid e-mail and a real message, and lands in the open list', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        service.submit({
          userId: null,
          email: 'nope',
          topic: 'order',
          message: 'long enough message',
        }),
      SupportError
    )
    await assert.rejects(
      () => service.submit({ userId: null, email: 'a@b.co', topic: 'order', message: 'short' }),
      /at least 10/
    )

    const sent = await service.submit({
      userId: null,
      email: ' Ali@Example.com ',
      topic: 'payment',
      orderCode: ' fo-abc123 ',
      message: 'My payment shows twice on the statement',
    })
    assert.equal(sent.email, 'ali@example.com')
    assert.equal(sent.orderCode, 'FO-ABC123')
    const open = await service.listOpen()
    assert.lengthOf(open, 1)
    assert.equal(open[0].topic, 'payment')
  })

  test('an admin marks it answered once; it leaves the list', async ({ assert }) => {
    const admin = await createUser('admin')
    const sent = await service.submit({
      userId: null,
      email: 'a@b.co',
      topic: 'other',
      message: 'Where do I find my invoice?',
    })
    await service.markAnswered(sent.id, admin.id)
    assert.lengthOf(await service.listOpen(), 0)
    await assert.rejects(() => service.markAnswered(sent.id, admin.id), /not found/)
  })
})
