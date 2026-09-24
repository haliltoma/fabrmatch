import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import User from '#models/user'
import RoleService from '#services/identity/role_service'
import UserAdminService, { UserAdminError } from '#services/admin/user_admin_service'
import UserSessionService from '#services/identity/user_session_service'
import AuditSearchService from '#services/admin/audit_search_service'
import EligibilityService from '#services/matching/eligibility_service'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const users = new UserAdminService()

type Found = { rows: unknown[] }
const n = async (search: Promise<Found>) => {
  const result = await search
  return result.rows.length
}
const ids = async (search: Promise<{ rows: Array<{ id: number }> }>) => {
  const result = await search
  return result.rows.map((r) => r.id)
}

async function admin() {
  const a = await createUser('admin')
  await new RoleService().assignRole(a, 'admin')
  return a
}

test.group('user administration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('search finds by e-mail or name, role and status; LIKE characters are literal', async ({
    assert,
  }) => {
    const seller = await createUser('needle-seller')
    await new RoleService().assignRole(seller, 'seller')
    await createUser('other')
    const admins = await admin()

    const byMail = await users.search({ q: 'needle-seller' })
    assert.deepEqual(
      byMail.rows.map((r) => r.id),
      [seller.id]
    )
    assert.deepEqual(byMail.rows[0].roles, ['seller'])
    assert.equal(await n(users.search({ q: '%' })), 0, '% is not a wildcard')

    const sellers = await users.search({ role: 'seller' })
    assert.deepEqual(
      sellers.rows.map((r) => r.id),
      [seller.id]
    )
    await users.suspend(seller.id, 'chargeback abuse', admins.id)
    assert.deepEqual(await ids(users.search({ suspended: true })), [seller.id])
    assert.notInclude(await ids(users.search({ suspended: false })), seller.id)
  })

  test('suspending signs the user out everywhere, is audited, and can be undone', async ({
    assert,
  }) => {
    const boss = await admin()
    const target = await createUser('target')
    const sessions = new UserSessionService()
    const sid = await sessions.start(target.id, { ip: null, userAgent: null })

    await assert.rejects(() => users.suspend(target.id, 'x', boss.id), /reason/)
    await assert.rejects(() => users.suspend(boss.id, 'testing myself', boss.id), /yourself/)
    await users.suspend(target.id, 'fraud investigation', boss.id)
    assert.isFalse(await sessions.check(sid, target.id))
    await assert.rejects(() => users.suspend(target.id, 'again please', boss.id), UserAdminError)
    const audit = await AuditLog.query().where('action', 'user.suspended').firstOrFail()
    assert.deepInclude(audit.meta, { reason: 'fraud investigation' })

    await users.unsuspend(target.id, boss.id)
    const restored = await User.findOrFail(target.id)
    assert.isNull(restored.suspendedAt)
    await assert.rejects(() => users.unsuspend(target.id, boss.id), /not suspended/)
  })

  test('a suspended user cannot log in and is thrown out of a live session', async ({
    client,
    assert,
  }) => {
    const boss = await admin()
    const target = await createUser('target')
    await new RoleService().assignRole(target, 'seller')
    await users.suspend(target.id, 'terms violation', boss.id)

    const kicked = await client.get('/seller').loginAs(target).redirects(0).headers(inertia)
    kicked.assertStatus(302)
    assert.equal(kicked.header('location'), '/login')

    const login = await client
      .post('/login')
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ email: target.email, password: 'password123' })
    login.assertStatus(302)
    assert.equal(login.header('location'), '/login')
  })

  test('a suspended maker is no longer offered orders', async ({ assert }) => {
    const boss = await admin()
    const maker = await createManufacturer()
    await createPrinter(maker.profile)
    const { order } = await createDraftOrder()
    const eligibility = new EligibilityService()
    assert.lengthOf(await eligibility.findCandidates(order), 1)
    await users.suspend(maker.user.id, 'quality issues', boss.id)
    assert.lengthOf(await eligibility.findCandidates(order), 0)
  })
})

test.group('audit search', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('filters by action family, subject, actor and date', async ({ assert }) => {
    const search = new AuditSearchService()
    const mk = (action: string, subjectType: string, subjectId: number, actorId: number | null) =>
      AuditLog.create({ action, subjectType, subjectId, actorId, meta: {} })
    const actorA = await createUser('actor')
    const actorB = await createUser('actor')
    await mk('order.transition', 'order', 7, null)
    await mk('order.cancelled', 'order', 8, actorA.id)
    await mk('user.suspended', 'user', 3, actorB.id)

    assert.equal(await n(search.search({ action: 'order.' })), 2)
    assert.equal(await n(search.search({ action: 'user.suspended' })), 1)
    assert.equal(await n(search.search({ subjectType: 'order', subjectId: 8 })), 1)
    assert.equal(await n(search.search({ actorId: actorA.id })), 1)
    assert.equal(await n(search.search({ from: '2999-01-01' })), 0)
    assert.equal(await n(search.search({ from: '2000-01-01', to: '2999-01-01' })), 3)
    assert.equal(await n(search.search({ action: '_' })), 0, '_ is literal')
  })

  test('the admin pages open for admins and refuse others', async ({ client, assert }) => {
    const boss = await admin()
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')

    const userPage = await client.get('/admin/users?q=admin').loginAs(boss).headers(inertia)
    userPage.assertStatus(200)
    assert.isArray(userPage.body().props.rows)
    const audit = await client.get('/admin/audit?action=order.').loginAs(boss).headers(inertia)
    audit.assertStatus(200)
    assert.equal(audit.body().props.filters.action, 'order.')
    const denied = await client.get('/admin/audit').loginAs(seller)
    denied.assertStatus(403)
  })
})

import FakePaymentProvider from '#services/payments/fake_provider'
import PayoutService from '#services/payments/payout_service'
import OrderHealthService from '#services/admin/order_health_service'
import { createFundedOrder } from '#tests/helpers/order_fixtures'

test.group('order health view (X-4)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('one screen shows money, ledger, provider events, payouts and the timeline', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const { order, profile } = await createFundedOrder(provider, { upTo: 'completed' })
    await new PayoutService(provider).release(order.id)

    const health = await new OrderHealthService().show(order.id)
    assert.exists(health)
    assert.equal(health!.order.code, order.code)
    assert.isTrue(health!.ledgerBalanced)
    assert.isAbove(health!.ledger.length, 2)
    assert.equal(health!.payments[0].status, 'succeeded')
    assert.isAbove(health!.payouts.length, 0)
    assert.equal(health!.jobs[0].alias, profile.publicAlias)
    assert.include(
      health!.timeline.map((t) => t.action),
      'order.transition'
    )
    assert.isNull(await new OrderHealthService().show(999999))
  })

  test('list search by code and the admin routes', async ({ client, assert }) => {
    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'paid' })
    const boss = await admin()
    const found = await new OrderHealthService().list({ q: order.code.slice(0, 6) })
    assert.include(
      found.rows.map((r) => r.id),
      order.id
    )
    const wildcard = await new OrderHealthService().list({ q: '%' })
    assert.equal(wildcard.rows.length, 0)

    const page = await client.get(`/admin/orders/${order.id}`).loginAs(boss).headers(inertia)
    page.assertStatus(200)
    assert.equal(page.body().props.order.id, order.id)
    const list = await client.get(`/admin/orders?q=${order.code}`).loginAs(boss).headers(inertia)
    list.assertStatus(200)
    const missing = await client.get('/admin/orders/999999').loginAs(boss).headers(inertia)
    missing.assertStatus(404)
  })
})
