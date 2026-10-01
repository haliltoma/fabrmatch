import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  // the old key during a rotation (node ace security:rotate-key); remove it once the command is done
  APP_KEY_PREVIOUS: Env.schema.secret.optional(),
  // admins must have two-factor on before they can use the admin panel; only tests turn this off
  ADMIN_2FA_REQUIRED: Env.schema.boolean.optional(),
  // `false` treats every account as verified (local dev only; ignored in production)
  EMAIL_VERIFICATION_REQUIRED: Env.schema.boolean.optional(),
  // default for automatic matching (admin can flip it in /admin/matching); off = an admin picks the maker
  MATCHING_AUTO_OFFER: Env.schema.boolean.optional(),
  // server-side rendering of Inertia pages (on unless set to false, e.g. for the browser tests)
  INERTIA_SSR: Env.schema.boolean.optional(),
  // slicer worker: `none` keeps the heuristic estimate, `orca` runs the CLI at SLICER_BIN
  // antivirus: clamd host for INSTREAM scans of model uploads; unset = signature checks only
  CLAMAV_HOST: Env.schema.string.optional(),
  CLAMAV_PORT: Env.schema.number.optional(),
  // signs the fake carrier's webhooks outside tests (no real carrier yet, D3); unset = a random one per process
  FAKE_CARRIER_SECRET: Env.schema.secret.optional(),

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
  REDIS_DB: Env.schema.number.optional(),

  // S3 / Minio
  S3_KEY: Env.schema.secret(),
  S3_SECRET: Env.schema.secret(),
  S3_BUCKET: Env.schema.string(),
  S3_REGION: Env.schema.string(),
  S3_ENDPOINT: Env.schema.string.optional(),

  // Payments (provider adapter, PRD §11)
  PAYMENT_PROVIDER: Env.schema.enum.optional(['fake', 'iyzico'] as const),
  PAYMENT_WEBHOOK_SECRET: Env.schema.secret.optional(),
  // Who sells to the buyer (R7, docs/legal/satis-ve-fatura-modeli.md): Fabrmatch itself (default)
  // or the maker through an iyzico marketplace
  SALES_MODEL: Env.schema.enum.optional(['merchant_of_record', 'marketplace'] as const),
  // Fabrmatch's own details, printed on what payees invoice and on expense vouchers
  COMPANY_LEGAL_NAME: Env.schema.string.optional(),
  COMPANY_TAX_NUMBER: Env.schema.string.optional(),
  COMPANY_TAX_OFFICE: Env.schema.string.optional(),
  COMPANY_ADDRESS: Env.schema.string.optional(),

  // Etsy Open API v3 app (developers.etsy.com): keystring + shared secret (R4-T5)
  ETSY_KEYSTRING: Env.schema.string.optional(),
  ETSY_SHARED_SECRET: Env.schema.secret.optional(),

  // iyzico (R1-T1): sandbox https://sandbox-api.iyzipay.com, live https://api.iyzipay.com
  IYZICO_BASE_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  IYZICO_API_KEY: Env.schema.secret.optional(),
  IYZICO_SECRET_KEY: Env.schema.secret.optional(),
  // true once iyzico enables the marketplace product on the account (sub-merchants, approve)
  IYZICO_MARKETPLACE: Env.schema.boolean.optional(),
  // our own sub-merchant that holds every basket item until the maker is known
  IYZICO_PLATFORM_SUBMERCHANT_KEY: Env.schema.string.optional(),

  // Exchange rates (defaults: tcmb in production, static elsewhere)
  FX_PROVIDER: Env.schema.enum.optional(['tcmb', 'static'] as const),

  // Mail
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.secret.optional(),
})
