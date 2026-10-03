import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderMessage from '#models/order_message'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import { createFundedOrder, createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('messages over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('buyer writes, maker reads it; contact details are refused; strangers get 404', async ({
    client,
    assert,
  }) => {
    const { order, buyer, makerUser } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'in_production',
    })
    await new RoleService().assignRole(buyer, 'seller')
    await new RoleService().assignRole(makerUser, 'manufacturer')

    const refused = await client
      .post(`/orders/${order.id}/messages`)
      .loginAs(buyer)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ body: 'Text me: 0532 111 22 33' })
    refused.assertStatus(422)
    assert.match(refused.body().error, /contact details/)

    const post = await client
      .post(`/orders/${order.id}/messages`)
      .loginAs(buyer)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ body: 'Could you print it in matte black?' })
    post.assertStatus(302)
    assert.equal(
      await OrderMessage.query()
        .where('orderId', order.id)
        .then((r) => r.length),
      1
    )

    const makerPage = await client
      .get(`/maker/orders/${order.id}/messages`)
      .loginAs(makerUser)
      .headers(inertia)
    makerPage.assertStatus(200)
    assert.equal(makerPage.body().props.messages[0].body, 'Could you print it in matte black?')
    assert.equal(makerPage.body().props.side, 'maker')

    const stranger = await createUser('stranger')
    await new RoleService().assignRole(stranger, 'seller')
    const denied = await client
      .get(`/orders/${order.id}/messages`)
      .loginAs(stranger)
      .headers(inertia)
    denied.assertStatus(404)
    const wrongDoor = await client
      .get(`/orders/${order.id}/messages`)
      .loginAs(makerUser)
      .headers(inertia)
    wrongDoor.assertStatus(404)

    const boss = await createUser('admin')
    await new RoleService().assignRole(boss, 'admin')
    const adminPage = await client
      .get(`/admin/orders/${order.id}/messages`)
      .loginAs(boss)
      .headers(inertia)
    adminPage.assertStatus(200)
    assert.lengthOf(adminPage.body().props.messages, 1)
  })
})
