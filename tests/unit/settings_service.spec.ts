import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import Setting from '#models/setting'
import SettingsService from '#services/settings/settings_service'
import { createUser } from '#tests/helpers/order_fixtures'

const service = new SettingsService()

test.group('SettingsService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(async () => {
    // the live config object is process-wide; put the defaults back
    await service.syncFromDatabase()
  })

  test('a saved value overrides the default, is audited, and can be reset', async ({ assert }) => {
    const admin = await createUser('admin')
    const defaultBps = service.defaultOf('pricing.commissionBps')

    await service.set('pricing.commissionBps', 1800, admin.id)
    assert.equal(fabrmatchConfig.pricing.commissionBps, 1800)
    const all = await service.list()
    const listed = all.find((s) => s.key === 'pricing.commissionBps')!
    assert.equal(listed.value, 1800)
    assert.isTrue(listed.overridden)
    assert.equal(listed.defaultValue, defaultBps)

    const audit = await AuditLog.query().where('action', 'setting.changed').firstOrFail()
    assert.deepInclude(audit.meta, { key: 'pricing.commissionBps', from: defaultBps, to: 1800 })
    assert.equal(audit.actorId, admin.id)

    await service.reset('pricing.commissionBps', admin.id)
    assert.equal(fabrmatchConfig.pricing.commissionBps, defaultBps)
    assert.isNull(await Setting.find('pricing.commissionBps'))
  })

  test('out-of-range, fractional-integer and unknown keys are rejected', async ({ assert }) => {
    const admin = await createUser('admin')
    await assert.rejects(() => service.set('pricing.commissionBps', 9000, admin.id))
    await assert.rejects(() => service.set('pricing.commissionBps', 12.5, admin.id))
    await assert.rejects(() => service.set('pricing.commissionBps', Number.NaN, admin.id))
    await assert.rejects(() => service.set('nope.nothing', 1, admin.id))
    assert.equal(
      await Setting.query()
        .count('* as n')
        .then((r) => Number(r[0].$extras.n)),
      0
    )
  })

  test('syncFromDatabase applies stored values and restores defaults for removed ones', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    await Setting.create({ key: 'orders.autoConfirmDays', value: 3, updatedBy: admin.id })
    await service.syncFromDatabase()
    assert.equal(fabrmatchConfig.orders.autoConfirmDays, 3)

    await Setting.query().where('key', 'orders.autoConfirmDays').delete()
    await service.syncFromDatabase()
    assert.equal(
      fabrmatchConfig.orders.autoConfirmDays,
      service.defaultOf('orders.autoConfirmDays')
    )
  })
})
