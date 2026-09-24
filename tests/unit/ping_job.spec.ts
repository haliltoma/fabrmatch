import { test } from '@japa/runner'
import queue from '@adonisjs/queue/services/main'
import Ping from '#jobs/ping'

test.group('PingJob', () => {
  test('dispatches ping job', async () => {
    using fake = queue.fake()

    await Ping.dispatch({ message: 'hello' })

    fake.assertPushed(Ping)
  })
})
