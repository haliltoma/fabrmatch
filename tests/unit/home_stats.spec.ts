import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import HomeStatsService, { HOME_MIN_MAKERS } from '#services/growth/home_stats_service'
import { createManufacturer, resetDatabase } from '#tests/helpers/order_fixtures'

test.group('home stats', (group) => {
  group.each.setup(() => resetDatabase())
  group.teardown(() => resetDatabase())

  test('counters stay hidden until there are enough makers and ratings', async ({ assert }) => {
    const service = new HomeStatsService()
    let stats = await service.load()
    assert.isNull(stats.makers)
    assert.isNull(stats.ratings)
    assert.isAbove(stats.confirmDays, 0)

    for (let i = 0; i < HOME_MIN_MAKERS; i++) await createManufacturer()
    stats = await service.load()
    assert.equal(stats.makers, HOME_MIN_MAKERS)
  })

  test('pending makers are not counted', async ({ assert }) => {
    for (let i = 0; i < HOME_MIN_MAKERS; i++) await createManufacturer()
    await db.from('manufacturer_profiles').update({ status: 'pending' })
    const stats = await new HomeStatsService().load()
    assert.isNull(stats.makers)
  })
})
