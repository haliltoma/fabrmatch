import app from '@adonisjs/core/services/app'
import {
  assertPaymentConfigured,
  currentPaymentRuntime,
} from '#services/payments/provider_registry'

/**
 * Fail fast at boot in production (web + workers) instead of on the first checkout:
 * the app refuses to start with the fake payment provider or a missing provider secret.
 */
if (app.inProduction) assertPaymentConfigured(currentPaymentRuntime())
