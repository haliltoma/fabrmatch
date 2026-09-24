import DomainError from '#exceptions/domain_error'
import { randomUUID } from 'node:crypto'
import { QueueManager } from '@boringnode/queue'
import redis from '@adonisjs/redis/services/main'

export class QueueMonitorError extends DomainError {}

const QUEUES = ['default']
const FAILED_LIMIT = 50
// keys of @boringnode/queue's redis adapter ("jobs" prefix)
const failedIndexKey = (queue: string) => `jobs::${queue}::failed::index`

/** Read-mostly window on the experimental queue: sizes, schedules that stopped firing, failed jobs. */
export default class QueueMonitorService {
  constructor(private queues: string[] = QUEUES) {}

  private get adapter() {
    return QueueManager.use()
  }

  async overview(now: Date = new Date()) {
    const queues = await Promise.all(
      this.queues.map(async (name) => ({ name, waiting: await this.adapter.sizeOf(name) }))
    )

    const rawSchedules = await this.adapter.listSchedules()
    const schedules = rawSchedules.map((s) => {
      const interval = s.everyMs ?? null
      // a schedule that should have fired more than two intervals ago is stuck
      const overdue =
        s.status === 'active' &&
        !!s.nextRunAt &&
        interval !== null &&
        now.getTime() - s.nextRunAt.getTime() > interval * 2
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        every: s.everyMs ? `${Math.round(s.everyMs / 60_000)} min` : (s.cronExpression ?? ''),
        runCount: s.runCount,
        lastRunAt: s.lastRunAt?.toISOString() ?? null,
        nextRunAt: s.nextRunAt?.toISOString() ?? null,
        overdue,
      }
    })

    const failed = []
    for (const queue of this.queues) {
      const ids = await redis.zrevrange(failedIndexKey(queue), 0, FAILED_LIMIT - 1)
      for (const id of ids) {
        const record = await this.adapter.getJob(id, queue)
        if (!record) continue
        failed.push({
          id,
          queue,
          name: record.data.name,
          attempts: record.data.attempts,
          error: record.error ?? null,
          failedAt: record.finishedAt ? new Date(record.finishedAt).toISOString() : null,
        })
      }
    }
    return { queues, schedules, failed }
  }

  /**
   * Puts a failed job back on its queue as a fresh job. Every job here is idempotent, so running
   * one again is safe. The failed record stays until its retention expires.
   */
  async runAgain(jobId: string, queue = 'default') {
    if (!this.queues.includes(queue)) throw new QueueMonitorError('Unknown queue')
    const record = await this.adapter.getJob(jobId, queue)
    if (!record || record.status !== 'failed') throw new QueueMonitorError('That job is not failed')
    await this.adapter.pushOn(queue, {
      ...record.data,
      id: randomUUID(),
      attempts: 0,
      nextRetryAt: undefined,
    })
  }

  async counts() {
    const { failed, schedules } = await this.overview()
    return { failedJobs: failed.length, stuckSchedules: schedules.filter((s) => s.overdue).length }
  }
}
