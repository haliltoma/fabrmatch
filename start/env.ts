import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  // admins must have two-factor on before they can use the admin panel; only tests turn this off
  ADMIN_2FA_REQUIRED: Env.schema.boolean.optional(),
  // slicer worker: `none` keeps the heuristic estimate, `orca` runs the CLI at SLICER_BIN
  // antivirus: clamd host for INSTREAM scans of model uploads; unset = signature checks only
  CLAMAV_HOST: Env.schema.string.optional(),
  CLAMAV_PORT: Env.schema.number.optional(),

  SLICER_DRIVER: Env.schema.enum.optional(['none', 'orca'] as const),
  SLICER_BIN: Env.schema.string.optional(),
  SLICER_PROFILES_DIR: Env.schema.string.optional(),
  // checkout asks for explicit acceptance of the legal documents; switch on once the texts are approved (D5)
  LEGAL_ACCEPTANCE_REQUIRED: Env.schema.boolean.optional(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.secret(),
  DB_DATABASE: Env.schema.string(),

  // Redis
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.secret.optional(),

  // S3 / Minio
  S3_KEY: Env.schema.secret(),
  S3_SECRET: Env.schema.secret(),
  S3_BUCKET: Env.schema.string(),
  S3_REGION: Env.schema.string(),
  S3_ENDPOINT: Env.schema.string.optional(),

  // Payments (provider adapter, PRD §11)
  PAYMENT_PROVIDER: Env.schema.enum.optional(['fake', 'iyzico'] as const),
  PAYMENT_WEBHOOK_SECRET: Env.schema.secret.optional(),

  // Exchange rates (defaults: tcmb in production, static elsewhere)
  FX_PROVIDER: Env.schema.enum.optional(['tcmb', 'static'] as const),

  // Mail
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.secret.optional(),
})
