/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import ExperimentService, { twoProportionP } from '#services/growth/experiment_service'
import { EXPERIMENTS } from '#services/growth/experiments'

const service = new ExperimentService()
const experiment = EXPERIMENTS[0]

async function seed(variant: string, exposures: number, conversions: number, offset: number) {
  const rows = []
  for (let i = 0; i < exposures; i++) {
    rows.push({
      experiment: experiment.key,
      variant,
      event: 'exposure',
      visitor_hash: `${variant}-${offset}-${i}`,
      created_at: new Date(),
    })
    if (i < conversions) {
      rows.push({
        experiment: experiment.key,
        variant,
        event: 'conversion',
        visitor_hash: `${variant}-${offset}-${i}`,
        created_at: new Date(),
      })
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    await db.table('experiment_events').multiInsert(rows.slice(i, i + 500))
  }
}

test.group('message tests (M4-T1)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => {
    experiment.enabled = true
  })

  test('a visitor always gets the same variant, and the split is close to even', ({ assert }) => {
    const counts: Record<string, number> = { A: 0, B: 0 }
    for (let i = 0; i < 4000; i++) {
      const visitor = service.visitorHash(`session-${i}`)
      const first = service.assign(experiment, visitor)
      assert.equal(service.assign(experiment, visitor), first)
      counts[first] += 1
    }
    assert.isAbove(counts.A, 1800)
    assert.isAbove(counts.B, 1800)
    assert.equal(counts.A + counts.B, 4000)
  })

  test('the visitor key is a keyed hash: stable, and not the session id', ({ assert }) => {
    const a = service.visitorHash('abc')
    assert.equal(a, service.visitorHash('abc'))
    assert.notEqual(a, service.visitorHash('abd'))
    assert.notInclude(a, 'abc')
    assert.match(a, /^[0-9a-f]{64}$/)
  })

  test('an exposure is stored once per visitor; bots and disabled tests store nothing', async ({
    assert,
  }) => {
    const first = await service.expose(experiment.key, 'session-1', 'Mozilla/5.0')
    const again = await service.expose(experiment.key, 'session-1', 'Mozilla/5.0')
    assert.equal(first, again)
    assert.lengthOf(await db.from('experiment_events'), 1)

    await service.expose(experiment.key, 'session-2', 'Googlebot/2.1')
    await service.expose(experiment.key, 'session-3', 'Mozilla/5.0 HeadlessChrome')
    assert.lengthOf(await db.from('experiment_events'), 1)

    experiment.enabled = false
    assert.equal(await service.expose(experiment.key, 'session-4', 'Mozilla/5.0'), 'A')
    assert.lengthOf(await db.from('experiment_events'), 1)
    assert.equal(await service.expose('no_such_test', 'session-5'), 'A')
  })

  test('a conversion counts once, and only for someone who saw the test', async ({ assert }) => {
    assert.isFalse(await service.convert(experiment.key, 'never-saw-it'))
    await service.expose(experiment.key, 'session-9', 'Mozilla/5.0')
    assert.isTrue(await service.convert(experiment.key, 'session-9'))
    assert.isFalse(await service.convert(experiment.key, 'session-9'))
    const [row] = await db.from('experiment_events').where('event', 'conversion')
    assert.equal(row.variant, await service.expose(experiment.key, 'session-9', 'Mozilla/5.0'))
    assert.lengthOf(await db.from('experiment_events').where('event', 'conversion'), 1)
  })

  test('the significance test matches a worked example', ({ assert }) => {
    // 100/1000 vs 150/1000: z ≈ -3.3, p ≈ 0.001
    const p = twoProportionP(100, 1000, 150, 1000)
    assert.isBelow(p, 0.002)
    assert.isAbove(p, 0.0005)
    assert.isAbove(twoProportionP(100, 1000, 102, 1000), 0.8)
    assert.equal(twoProportionP(0, 100, 0, 100), 1)
  })

  test('a result is only called with enough visitors, and only when the gap is real', async ({
    assert,
  }) => {
    const pick = async () => (await service.results()).find((r) => r.key === experiment.key)!

    await seed('A', 50, 20, 0)
    await seed('B', 50, 5, 0)
    let result = await pick()
    assert.equal(result.verdict, 'not_enough_data') // a big gap, but far too few visitors
    assert.isNull(result.pValue)
    assert.isNull(result.winner)

    await db.from('experiment_events').delete()
    await seed('A', 400, 40, 1)
    await seed('B', 400, 41, 1)
    result = await pick()
    assert.equal(result.verdict, 'no_clear_difference')
    assert.isNull(result.winner)
    assert.isAbove(result.pValue!, 0.05)

    await db.from('experiment_events').delete()
    await seed('A', 400, 40, 2)
    await seed('B', 400, 80, 2)
    result = await pick()
    assert.equal(result.verdict, 'winner')
    assert.equal(result.winner, 'B')
    assert.isBelow(result.pValue!, 0.05)
    assert.equal(result.variants[1].conversions, 80)
  })
})
