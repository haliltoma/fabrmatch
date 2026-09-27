import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import User from '#models/user'
import UserSession from '#models/user_session'
import VerificationToken from '#models/verification_token'
import { hashToken } from '#services/identity/auth_security_service'
import AuthSecurityService from '#services/identity/auth_security_service'
import TotpService from '#services/identity/totp_service'
import TwoFactorService, { TwoFactorError } from '#services/identity/two_factor_service'
import UserSessionService, { describeDevice } from '#services/identity/user_session_service'
import { createUser } from '#tests/helpers/order_fixtures'

const totp = new TotpService()
const service = new TwoFactorService()

async function userWithTwoFactor() {
  const user = await createUser('tf')
  const { secret } = service.startSetup(user)
  const step = totp.stepAt(Date.now())
  const codes = await service.enable(user, secret, totp.codeForStep(secret, step))
  return { user, secret, codes, enabledStep: step }
}

test.group('TwoFactorService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('enable needs a valid code, stores the secret encrypted, and returns 10 backup codes', async ({
    assert,
  }) => {
    const user = await createUser('tf')
    const { secret } = service.startSetup(user)
    await assert.rejects(() => service.enable(user, secret, '000000'), /not right/)
    assert.isFalse(service.isEnabled(user))

    const codes = await service.enable(
      user,
      secret,
      totp.codeForStep(secret, totp.stepAt(Date.now()))
    )
    assert.lengthOf(codes, 10)
    assert.isTrue(service.isEnabled(user))
    const row = await User.findOrFail(user.id)
    assert.isNotNull(row.twoFactorSecretEnc)
    assert.notInclude(row.twoFactorSecretEnc!, secret)
    assert.equal(await service.backupCodesRemaining(user.id), 10)
    const audit = await AuditLog.query().where('action', 'auth.two_factor_enabled').first()
    assert.equal(audit?.subjectId, user.id)
  })

  test('a code cannot be replayed, and the next step still works', async ({ assert }) => {
    const { user, secret, enabledStep } = await userWithTwoFactor()
    const sameStep = totp.codeForStep(secret, enabledStep)
    assert.isNull(await service.verifyLogin(user, sameStep), 'the enabling code is already spent')

    const next = totp.codeForStep(secret, enabledStep + 1)
    assert.equal(await service.verifyLogin(user, next), 'totp')
    assert.isNull(await service.verifyLogin(user, next), 'replay of the accepted code')
  })

  test('a backup code works exactly once', async ({ assert }) => {
    const { user, codes } = await userWithTwoFactor()
    assert.equal(await service.verifyLogin(user, codes[0]), 'backup')
    assert.isNull(await service.verifyLogin(user, codes[0]))
    assert.equal(
      await service.verifyLogin(user, codes[1].toUpperCase().replace('-', ' ')),
      'backup'
    )
    assert.equal(await service.backupCodesRemaining(user.id), 8)
    assert.isNull(await service.verifyLogin(user, 'zzzzz-zzzzz'))
  })

  test('regenerating backup codes retires the old ones', async ({ assert }) => {
    const { user, secret, codes, enabledStep } = await userWithTwoFactor()
    const fresh = await service.regenerateBackupCodes(
      user,
      totp.codeForStep(secret, enabledStep + 1)
    )
    assert.lengthOf(fresh, 10)
    assert.isNull(await service.verifyLogin(user, codes[0]))
    assert.equal(await service.verifyLogin(user, fresh[0]), 'backup')
  })

  test('turning it off needs the password and a code', async ({ assert }) => {
    const { user, secret, enabledStep } = await userWithTwoFactor()
    await assert.rejects(
      () => service.disable(user, 'wrong-password', totp.codeForStep(secret, enabledStep + 1)),
      /Password/
    )
    await assert.rejects(() => service.disable(user, 'password123', '123456'), TwoFactorError)
    assert.isTrue(service.isEnabled(user))

    await service.disable(user, 'password123', totp.codeForStep(secret, enabledStep + 1))
    assert.isFalse(service.isEnabled(user))
    assert.equal(await service.backupCodesRemaining(user.id), 0)
  })
})

test.group('UserSessionService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('sessions are listed, checked, and revoked per user', async ({ assert }) => {
    const sessions = new UserSessionService()
    const user = await createUser('sess')
    const other = await createUser('sess')
    const a = await sessions.start(user.id, {
      ip: '1.1.1.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537',
    })
    const b = await sessions.start(user.id, { ip: '2.2.2.2', userAgent: null })
    const foreign = await sessions.start(other.id, { ip: null, userAgent: null })

    assert.isTrue(await sessions.check(a, user.id))
    assert.isFalse(await sessions.check(a, other.id), 'another user cannot use the id')
    assert.lengthOf(await sessions.list(user.id), 2)

    assert.isFalse(await sessions.revoke(other.id, a), 'cannot revoke someone else’s session')
    assert.isTrue(await sessions.revoke(user.id, a))
    assert.isFalse(await sessions.check(a, user.id))
    assert.isFalse(await sessions.revoke(user.id, a), 'already revoked')

    assert.equal(await sessions.revokeAll(user.id, b), 0, 'the kept session is spared')
    const c = await sessions.start(user.id, { ip: null, userAgent: null })
    assert.equal(await sessions.revokeAll(user.id, b), 1)
    assert.isTrue(await sessions.check(b, user.id))
    assert.isFalse(await sessions.check(c, user.id))
    assert.isTrue(await sessions.check(foreign, other.id), 'other users are untouched')
  })

  test('last-seen refreshes only when stale', async ({ assert }) => {
    const sessions = new UserSessionService()
    const user = await createUser('sess')
    const id = await sessions.start(user.id, { ip: null, userAgent: null })
    const first = await UserSession.findOrFail(id)
    const before = first.lastSeenAt
    await sessions.check(id, user.id)
    const unchanged = await UserSession.findOrFail(id)
    assert.equal(unchanged.lastSeenAt.toMillis(), before.toMillis())

    await UserSession.query()
      .where('id', id)
      .update({ last_seen_at: DateTime.now().minus({ hours: 1 }).toSQL() })
    await sessions.check(id, user.id)
    const after = await UserSession.findOrFail(id)
    assert.isAbove(after.lastSeenAt.toMillis(), DateTime.now().minus({ minutes: 1 }).toMillis())
  })

  test('a password reset signs the user out everywhere', async ({ assert }) => {
    const sessions = new UserSessionService()
    const user = await createUser('reset')
    const id = await sessions.start(user.id, { ip: null, userAgent: null })
    await VerificationToken.create({
      userId: user.id,
      type: 'password_reset',
      token: hashToken('reset-token-1'),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })
    assert.isTrue(await new AuthSecurityService().resetPassword('reset-token-1', 'brand-new-pass'))
    assert.isFalse(await sessions.check(id, user.id))
  })

  test('reset tokens are stored only as a hash and work exactly once', async ({ assert }) => {
    const user = await createUser('hashed')
    // the raw token only ever exists in the e-mailed link
    const raw: string = await new AuthSecurityService()['createToken'](user.id, 'password_reset', 1)
    assert.match(raw, /^[0-9a-f]{64}$/)

    const row = await VerificationToken.query().where('userId', user.id).firstOrFail()
    assert.notEqual(row.token, raw, 'the database never holds the token itself')
    assert.equal(row.token, hashToken(raw))

    const auth = new AuthSecurityService()
    const [first, second] = await Promise.all([
      auth.resetPassword(raw, 'new-password-1'),
      auth.resetPassword(raw, 'new-password-2'),
    ])
    assert.equal([first, second].filter(Boolean).length, 1, 'two concurrent uses: one wins')
    assert.isFalse(await auth.resetPassword(row.token, 'new-password-3'), 'the hash is no key')
  })

  test('device labels are readable', ({ assert }) => {
    assert.equal(describeDevice(null), 'Unknown device')
    assert.equal(
      describeDevice(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Chrome/120.0 Safari/537.36'
      ),
      'Chrome on macOS'
    )
    assert.equal(
      describeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17 Safari/604'
      ),
      'Safari on iOS'
    )
  })
})
