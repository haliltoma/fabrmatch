import { defineConfig, drivers } from '@adonisjs/queue'

const queueConfig = defineConfig({
  default: 'redis',

  // where `queue:work` finds the job classes; without it the worker registers none and every job
  // fails with "Requested job … is not registered" (relative to the cwd: the app root, or build/)
  locations: ['./app/jobs/**/*.{ts,js}'],

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
