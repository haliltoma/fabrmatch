/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Redis
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.secret.optional(),

  // Database
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.secret.optional(),
  DB_DATABASE: Env.schema.string(),

  // Variables for configuring @adonisjs/queue
  QUEUE_DRIVER: Env.schema.enum(['redis', 'database', 'sync'] as const),

  // Sistem A sözleşmesi (docs/09-API-SOZLESMESI.md)
  SISTEM_A_URL: Env.schema.string({ format: 'url', tld: false }),
  SISTEM_A_INBOUND_API_KEY: Env.schema.secret(),
  FABRMATCH_WEBHOOK_SECRET: Env.schema.secret(),

  // Geometri servisi
  GEOMETRY_URL: Env.schema.string({ format: 'url', tld: false }),
  GEOMETRY_SERVICE_KEY: Env.schema.secret(),
})
