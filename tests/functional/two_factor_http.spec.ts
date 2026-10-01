import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import redis from '@adonisjs/redis/services/main'
import limiter from '@adonisjs/limiter/services/main'
import fabrmatchConfig from '#config/fabrmatch'
import UserSession from '#models/user_session'
import RoleService from '#services/identity/role_service'
import TotpService from '#services/identity/totp_service'
import TwoFactorService from '#services/identity/two_factor_service'
import UserSessionService from '#services/identity/user_session_service'
import { twoFactorThrottleKey } from '#controllers/two_factor_challenge_controller'
import { createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const totp = new TotpService()

async function enrolled(role?: 'admin' | 'seller') {
  const user = await createUser(role ?? 'plain')
  if (role) await new RoleService().assignRole(user, role)
  const service = new TwoFactorService()
  const { secret } = service.startSetup(user)
  const step = totp.stepAt(Date.now())
  await service.enable(user, secret, totp.codeForStep(secret, step))
  return { user, secret, step }
}

const clearThrottle = (userId: string) =>
  limiter.use({ requests: 5, duration: '15 minutes' }).delete(twoFactorThrottleKey(userId))

test.group('login second step', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the password alone does not sign a 2FA user in', async ({ client, assert }) => {
    const { user } = await enrolled()
    // the caller's address varies (::1, 127.0.0.1); clear every login bucket
    const stale = await redis.keys('rlflx:login:*')
    if (stale.length > 0) await redis.del(...stale)

    const response = await client
      .post('/login')
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ email: user.email, password: 'password123' })
    response.assertStatus(302)
    assert.equal(response.header('location'), '/login/two-factor')
    assert.lengthOf(await UserSession.query().where('userId', user.id), 0)
  })

  test('a right code finishes the login and records the session', async ({ client, assert }) => {
    const { user, secret, step } = await enrolled()
    await clearThrottle(user.id)

    const response = await client
      .post('/login/two-factor')
      .withSession({ twoFactorPending: { userId: user.id, at: Date.now() } })
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ code: totp.codeForStep(secret, step + 1) })
    response.assertStatus(302)
    // no role yet → their landing page is role selection
    assert.equal(response.header('location'), '/onboarding')
    const sessions = await UserSession.query().where('userId', user.id)
    assert.lengthOf(sessions, 1)
  })

  test('a wrong code sends the user back and signs nobody in', async ({ client, assert }) => {
    const { user } = await enrolled()
    await clearThrottle(user.id)

    const response = await client
      .post('/login/two-factor')
      .withSession({ twoFactorPending: { userId: user.id, at: Date.now() } })
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ code: '000000' })
    response.assertStatus(302)
    assert.equal(response.header('location'), '/login/two-factor')
    assert.lengthOf(await UserSession.query().where('userId', user.id), 0)
  })

  test('after 5 wrong codes the sixth attempt is blocked, even with the right code', async ({
    client,
    assert,
  }) => {
    const { user, secret, step } = await enrolled()
    await clearThrottle(user.id)
    const attempt = (code: string) =>
      client
        .post('/login/two-factor')
        .withSession({ twoFactorPending: { userId: user.id, at: Date.now() } })
        .withCsrfToken()
        .headers(inertia)
        .redirects(0)
        .json({ code })

    for (let i = 0; i < 5; i++) await attempt('000000')
    const blocked = await attempt(totp.codeForStep(secret, step + 1))
    assert.equal(blocked.status(), 429)
    assert.lengthOf(await UserSession.query().where('userId', user.id), 0)
    await clearThrottle(user.id)
  })

  test('without a pending password step the page bounces to login; expired pending too', async ({
    client,
    assert,
  }) => {
    const none = await client.get('/login/two-factor').redirects(0).headers(inertia)
    none.assertStatus(302)
    assert.equal(none.header('location'), '/login')

    const { user } = await enrolled()
    const stale = await client
      .get('/login/two-factor')
      .withSession({ twoFactorPending: { userId: user.id, at: Date.now() - 11 * 60_000 } })
      .redirects(0)
      .headers(inertia)
    assert.equal(stale.header('location'), '/login')
  })
})

test.group('admin two-factor enforcement', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    fabrmatchConfig.security.requireAdminTwoFactor = true
    return () => {
      fabrmatchConfig.security.requireAdminTwoFactor = false
    }
  })

  test('an admin without 2FA is sent to account security; with 2FA the panel opens', async ({
    client,
    assert,
  }) => {
    const bare = await createUser('admin')
    await new RoleService().assignRole(bare, 'admin')
    const blocked = await client.get('/admin/queues').loginAs(bare).redirects(0).headers(inertia)
    blocked.assertStatus(302)
    assert.equal(blocked.header('location'), '/account/security')

    const json = await client
      .get('/admin/queues')
      .loginAs(bare)
      .header('accept', 'application/json')
    json.assertStatus(403)
    assert.equal(json.body().code, 'two_factor_required')

    const { user } = await enrolled('admin')
    const open = await client.get('/admin/queues').loginAs(user).headers(inertia)
    open.assertStatus(200)
  })

  test('non-admins are never asked for 2FA, and admins cannot switch it off', async ({
    client,
    assert,
  }) => {
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')
    const page = await client.get('/account/security').loginAs(seller).headers(inertia)
    page.assertStatus(200)
    assert.isFalse(page.body().props.twoFactor.required)

    const { user, secret, step } = await enrolled('admin')
    const attempt = await client
      .post('/account/security/two-factor/disable')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ password: 'password123', code: totp.codeForStep(secret, step + 1) })
    attempt.assertStatus(302)
    assert.isTrue(new TwoFactorService().isEnabled(user))
  })
})

test.group('session revocation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a revoked session is signed out on its next request; a live one is not', async ({
    client,
    assert,
  }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const sessions = new UserSessionService()
    const live = await sessions.start(user.id, { ip: null, userAgent: null })
    const dead = await sessions.start(user.id, { ip: null, userAgent: null })
    await sessions.revoke(user.id, dead)

    const ok = await client
      .get('/account/security')
      .loginAs(user)
      .withSession({ sid: live })
      .headers(inertia)
    ok.assertStatus(200)
    const kicked = await client
      .get('/account/security')
      .loginAs(user)
      .withSession({ sid: dead })
      .redirects(0)
      .headers(inertia)
    kicked.assertStatus(302)
    assert.equal(kicked.header('location'), '/login')
  })

  test('changing the password signs out other sessions but keeps this one', async ({
    client,
    assert,
  }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const sessions = new UserSessionService()
    const mine = await sessions.start(user.id, { ip: null, userAgent: null })
    const other = await sessions.start(user.id, { ip: null, userAgent: null })

    const response = await client
      .post('/account/security/password')
      .loginAs(user)
      .withSession({ sid: mine })
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        currentPassword: 'password123',
        password: 'a-new-password',
        passwordConfirmation: 'a-new-password',
      })
    response.assertStatus(302)
    assert.isTrue(await sessions.check(mine, user.id))
    assert.isFalse(await sessions.check(other, user.id))
  })

  test('a wrong current password changes nothing', async ({ client, assert }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const sessions = new UserSessionService()
    const other = await sessions.start(user.id, { ip: null, userAgent: null })

    await client
      .post('/account/security/password')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        currentPassword: 'not-it',
        password: 'a-new-password',
        passwordConfirmation: 'a-new-password',
      })
    assert.isTrue(await sessions.check(other, user.id))
  })
})
