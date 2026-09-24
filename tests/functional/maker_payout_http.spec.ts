/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import EncryptionService from '#services/identity/encryption_service'
import RoleService from '#services/identity/role_service'
import { createManufacturer, createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const IBAN = 'TR33 0006 1005 1978 6457 8413 26'

async function maker() {
  const { user, profile } = await createManufacturer()
  await new RoleService().assignRole(user, 'manufacturer')
  return { user, profile }
}

test.group('maker payout account over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const save = (client: any, user: any, body: object) =>
    client
      .post('/maker/payout')
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json(body)

  test('a valid IBAN with the right password is stored encrypted and shown only masked', async ({
    client,
    assert,
  }) => {
    const { user, profile } = await maker()
    const empty = await client.get('/maker/payout').headers(inertia).loginAs(user)
    assert.isNull(empty.body().props.masked)

    const saved = await client
      .post('/maker/payout')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ iban: IBAN, password: 'password123' })
    saved.assertStatus(302)

    const stored = (await ManufacturerProfile.findOrFail(profile.id)).ibanEnc!
    assert.notInclude(stored, '0006')
    assert.equal(new EncryptionService().decrypt(stored), 'TR330006100519786457841326')

    const page = await client.get('/maker/payout').headers(inertia).loginAs(user)
    const text = JSON.stringify(page.body().props)
    assert.include(text, 'TR33')
    assert.notInclude(text, '1005')
    assert.notInclude(text, '7841')
    assert.lengthOf(await AuditLog.query().where('action', 'maker.iban_changed'), 1)
    // the audit line never contains the number
    assert.notInclude(
      JSON.stringify(await AuditLog.query().where('action', 'maker.iban_changed')),
      '0006'
    )
  })

  test('a wrong password or a broken IBAN changes nothing', async ({ client, assert }) => {
    const { user, profile } = await maker()
    ;(await save(client, user, { iban: IBAN, password: 'nope-nope' })).assertStatus(422)
    ;(
      await save(client, user, {
        iban: 'TR33 0006 1005 1978 6457 8413 27',
        password: 'password123',
      })
    ).assertStatus(422)
    assert.isNull((await ManufacturerProfile.findOrFail(profile.id)).ibanEnc)
    assert.lengthOf(await AuditLog.query().where('action', 'maker.iban_changed'), 0)
  })

  test('only makers can reach it', async ({ client }) => {
    const other = await createUser('seller')
    await new RoleService().assignRole(other, 'seller')
    ;(await client.get('/maker/payout').loginAs(other)).assertStatus(403)
  })
})
