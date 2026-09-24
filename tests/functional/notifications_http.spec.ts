import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Notification from '#models/notification'
import NotificationService from '#services/notifications/notification_service'
import RoleService from '#services/identity/role_service'
import { createUser } from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const service = new NotificationService()

async function seed(userId: number, key: string) {
  await service.notify({
    userId,
    type: 'order_cancelled',
    role: 'buyer',
    context: { code: `FO-${key}`, orderId: 7 },
    eventKey: `http:${key}`,
  })
  return Notification.query().where('userId', userId).where('eventKey', `http:${key}`).firstOrFail()
}

test.group('notification endpoints', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('inbox lists only my notifications and exposes the unread count', async ({
    client,
    assert,
  }) => {
    const me = await createUser('me')
    const other = await createUser('other')
    await new RoleService().assignRole(me, 'seller')
    await seed(me.id, 'MINE')
    await seed(other.id, 'THEIRS')

    const response = await client.get('/notifications').headers(INERTIA).loginAs(me)
    response.assertStatus(200)
    const { props } = response.body()
    assert.lengthOf(props.notifications, 1)
    assert.include(props.notifications[0].title, 'FO-MINE')
    assert.equal(props.unreadNotifications, 1)
  })

  test('opening marks it read and follows the link; others’ notifications are untouched', async ({
    client,
    assert,
  }) => {
    const me = await createUser('me')
    const other = await createUser('other')
    await new RoleService().assignRole(me, 'seller')
    const mine = await seed(me.id, 'A')
    const theirs = await seed(other.id, 'B')

    const ok = await client.get(`/notifications/${mine.id}/open`).loginAs(me).redirects(0)
    ok.assertStatus(302)
    assert.equal(ok.header('location'), '/orders/7')
    const mineAfter = await Notification.findOrFail(mine.id)
    assert.isNotNull(mineAfter.readAt)

    const foreign = await client.get(`/notifications/${theirs.id}/open`).loginAs(me).redirects(0)
    foreign.assertStatus(302)
    assert.equal(foreign.header('location'), '/notifications')
    const theirsAfter = await Notification.findOrFail(theirs.id)
    assert.isNull(theirsAfter.readAt)
  })

  test('read-all and preferences work; unknown types are rejected; guests are redirected', async ({
    client,
    assert,
  }) => {
    const me = await createUser('me')
    await new RoleService().assignRole(me, 'seller')
    await seed(me.id, 'C')
    await seed(me.id, 'D')

    await client.post('/notifications/read-all').withCsrfToken().loginAs(me).redirects(0)
    assert.equal(await service.unreadCount(me.id), 0)

    await client
      .post('/notifications/preferences')
      .withCsrfToken()
      .loginAs(me)
      .redirects(0)
      .json({ type: 'order_shipped', email: false })
    const prefs = await service.emailPreferences(me.id)
    assert.isFalse(prefs.order_shipped)

    const bad = await client
      .post('/notifications/preferences')
      .withCsrfToken()
      .loginAs(me)
      .redirects(0)
      .json({ type: 'bogus', email: false })
    assert.notEqual(bad.status(), 500)

    const guest = await client.get('/notifications').redirects(0)
    guest.assertStatus(302)
  })
})
