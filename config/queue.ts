import { defineConfig, drivers } from '@adonisjs/queue'

const queueConfig = defineConfig({
  default: 'redis',

  // failed jobs stay visible for a week (admin queue panel); without this they vanish on failure
  defaultJobOptions: { removeOnFail: { age: '7d', count: 500 } },

  adapters: {
    redis: drivers.redis({
      connectionName: 'main',
    }),
    sync: drivers.sync(),
  },
})

export default queueConfig
