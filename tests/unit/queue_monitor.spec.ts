import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { QueueManager } from '@boringnode/queue'
import redis from '@adonisjs/redis/services/main'
import QueueMonitorService from '#services/admin/queue_monitor_service'

// its own queue name, so the developer's real "default" queue is never touched
const QUEUE = `monitor_test_${randomUUID().slice(0, 8)}`

test.group('queue monitor (X-5)', (group) => {
  group.teardown(async () => {
    const keys = await redis.keys(`jobs::${QUEUE}::*`)
    if (keys.length > 0) await redis.del(...keys)
  })

  test('a failed job is listed with its error and can be run again', async ({ assert }) => {
    const adapter = QueueManager.use()
    adapter.setWorkerId('monitor-test')
    const id = randomUUID()
    await adapter.pushOn(QUEUE, { id, name: 'FakeJob', payload: { a: 1 }, attempts: 0 })
    const acquired = await adapter.popFrom(QUEUE)
    assert.equal(acquired?.id, id)
    await adapter.failJob(id, QUEUE, new Error('boom'), { age: '7d', count: 10 })

    const monitor = new QueueMonitorService([QUEUE])
    const before = await monitor.overview()
    assert.equal(before.queues[0].waiting, 0)
    assert.lengthOf(before.failed, 1)
    assert.equal(before.failed[0].name, 'FakeJob')
    assert.include(before.failed[0].error ?? '', 'boom')

    await monitor.runAgain(id, QUEUE)
    const after = await monitor.overview()
    assert.equal(after.queues[0].waiting, 1, 'a fresh copy is waiting')

    await assert.rejects(() => monitor.runAgain('nope', QUEUE), /not failed/)
    await assert.rejects(() => monitor.runAgain(id, 'other'), /Unknown queue/)
  })

  test('schedules are reported; a healthy one is not flagged', async ({ assert }) => {
    const overview = await new QueueMonitorService([QUEUE]).overview()
    assert.isArray(overview.schedules)
    assert.isFalse(overview.schedules.some((s) => s.overdue && s.status !== 'active'))
  })
})
