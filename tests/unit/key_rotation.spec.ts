import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import EncryptionService, { ENCRYPTED_COLUMNS } from '#services/identity/encryption_service'
import KeyRotationService from '#services/identity/key_rotation_service'
import { createDraftOrder, createUser } from '#tests/helpers/order_fixtures'

const OLD = 'old-app-key-0123456789abcdef0123456789'
const NEW = 'new-app-key-fedcba9876543210fedcba9876'
const OTHER = 'some-other-key-that-nobody-configured-00'

test.group('APP_KEY rotation (R5-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('every *_enc column in the database is on the rotation list', async ({ assert }) => {
    const result = await db.rawQuery(
      `select table_name, column_name from information_schema.columns
        where table_schema = current_schema() and column_name like '%\\_enc'`
    )
    const inDb = result.rows.map(
      (r: { table_name: string; column_name: string }) => `${r.table_name}.${r.column_name}`
    )
    assert.sameMembers(
      ENCRYPTED_COLUMNS.map((c) => `${c.table}.${c.column}`),
      inDb
    )
  })

  test('with the previous key set, values under the old key still decrypt', ({ assert }) => {
    const oldCipher = new EncryptionService(OLD, null).encrypt('TR33 0006 1005 1978 6457 8413 26')
    assert.throws(() => new EncryptionService(NEW, null).decrypt(oldCipher))
    assert.equal(
      new EncryptionService(NEW, OLD).decrypt(oldCipher),
      'TR33 0006 1005 1978 6457 8413 26'
    )
  })

  test('re-encrypts old values, skips current ones, never touches unreadable ones', async ({
    assert,
  }) => {
    const old = new EncryptionService(OLD, null)
    const { order } = await createDraftOrder()
    const user = await createUser('twofa')
    const other = await createUser('stray')
    await db
      .from('orders')
      .where('id', order.id)
      .update({ shipping_address_enc: old.encrypt('{"city":"Istanbul"}') })
    await db
      .from('users')
      .where('id', user.id)
      .update({ two_factor_secret_enc: old.encrypt('JBSWY3DPEHPK3PXP') })
    const stray = new EncryptionService(OTHER, null).encrypt('lost')
    await db.from('users').where('id', other.id).update({ two_factor_secret_enc: stray })

    const rotation = new KeyRotationService(new EncryptionService(NEW, OLD))
    const dry = await rotation.rotate({ dryRun: true })
    const usersDry = dry.find((r) => r.table === 'users')!
    assert.equal(usersDry.rotated, 1)
    const unchanged = await db.from('users').where('id', user.id).first()
    assert.isFalse(new EncryptionService(NEW, null).isCurrent(unchanged.two_factor_secret_enc))

    const reports = await rotation.rotate()
    const users = reports.find((r) => r.table === 'users')!
    assert.equal(users.rotated, 1)
    assert.deepEqual(users.unreadable, [other.id])

    const current = new EncryptionService(NEW, null)
    const u = await db.from('users').where('id', user.id).first()
    assert.equal(current.decrypt(u.two_factor_secret_enc), 'JBSWY3DPEHPK3PXP')
    const o = await db.from('orders').where('id', order.id).first()
    assert.equal(current.decrypt(o.shipping_address_enc), '{"city":"Istanbul"}')
    const s = await db.from('users').where('id', other.id).first()
    assert.equal(s.two_factor_secret_enc, stray, 'an unreadable value is left as it was')

    // idempotent: a second run has nothing left to do
    const again = await rotation.rotate()
    assert.equal(
      again.reduce((n, r) => n + r.rotated, 0),
      0
    )
  })
})
