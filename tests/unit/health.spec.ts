/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import fabrmatchConfig from '#config/fabrmatch'
import FxService from '#services/pricing/fx_service'
import { StaticFxProvider } from '#services/pricing/fx_provider'
import HealthService from '#services/admin/health_service'

test.group('health (R3-T9)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a healthy system answers ok and lists no data', async ({ assert }) => {
    const report = await new HealthService().check()
    assert.deepEqual(report.checks, { database: true, redis: true })
    assert.notInclude(report.alarms, 'webhook_lag')
    assert.oneOf(report.status, ['ok', 'degraded'])
  })

  test('an unprocessed webhook older than ten minutes raises an alarm', async ({ assert }) => {
    await db.table('payment_webhooks').insert({
      provider: 'fake',
      provider_event_id: 'evt_stuck_1',
      type: 'payment.succeeded',
      payload: JSON.stringify({}),
      received_at: new Date(Date.now() - 30 * 60_000),
    })
    const report = await new HealthService().check()
    assert.include(report.alarms, 'webhook_lag')
    assert.equal(report.status, 'degraded')
  })

  test('a switched-on currency with a missing or ageing rate raises fx_stale; TRY only never does', async ({
    assert,
  }) => {
    const flags = fabrmatchConfig.flags as Record<string, number>
    try {
      assert.notInclude((await new HealthService().check()).alarms, 'fx_stale')

      flags.currencyUsd = 1 // on, but no rate stored yet
      assert.include((await new HealthService().check()).alarms, 'fx_stale')

      await new FxService().refresh(new StaticFxProvider())
      assert.notInclude((await new HealthService().check()).alarms, 'fx_stale')

      // older than half of the 72 h limit: warn before orders start being refused
      await db
        .from('fx_rates')
        .where('currency', 'USD')
        .update({ created_at: new Date(Date.now() - 40 * 3_600_000) })
      const stale = await new HealthService().check()
      assert.include(stale.alarms, 'fx_stale')
      assert.equal(stale.status, 'degraded')
    } finally {
      flags.currencyUsd = 0
    }
  })
})
