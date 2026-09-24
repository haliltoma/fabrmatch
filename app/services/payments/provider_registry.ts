import env from '#start/env'
import FakePaymentProvider from '#services/payments/fake_provider'
import { PaymentNotConfiguredError, type PaymentProvider } from '#services/payments/provider'

let current: PaymentProvider | null = null

export interface PaymentRuntime {
  nodeEnv: 'development' | 'production' | 'test'
  provider: string
  webhookSecret: string | undefined
}

/**
 * Pure deploy guard (R0-T8): throws unless the payment setup is safe for this environment.
 * The fake provider signs webhooks with a shared secret, so outside dev/test it must never run.
 */
export function assertPaymentConfigured(runtime: PaymentRuntime): void {
  const { nodeEnv, provider, webhookSecret } = runtime
  if (provider === 'fake') {
    if (nodeEnv !== 'development' && nodeEnv !== 'test') {
      throw new PaymentNotConfiguredError(
        `PAYMENT_PROVIDER=fake is not allowed when NODE_ENV=${nodeEnv}. Set a real provider.`
      )
    }
    if (nodeEnv !== 'test' && !webhookSecret) {
      throw new PaymentNotConfiguredError(
        'PAYMENT_WEBHOOK_SECRET is required for the fake provider'
      )
    }
    return
  }
  // iyzico adapter lands with R1-T1 (needs sandbox keys + marketplace docs).
  throw new PaymentNotConfiguredError(`Payment provider "${provider}" is not implemented yet`)
}

export function currentPaymentRuntime(): PaymentRuntime {
  return {
    nodeEnv: env.get('NODE_ENV'),
    provider: env.get('PAYMENT_PROVIDER', 'fake'),
    webhookSecret: env.get('PAYMENT_WEBHOOK_SECRET')?.release(),
  }
}

/** Single provider instance for the process. Tests swap it with `setPaymentProvider`. */
export function paymentProvider(): PaymentProvider {
  if (current) return current
  const runtime = currentPaymentRuntime()
  assertPaymentConfigured(runtime)
  current = new FakePaymentProvider(runtime.webhookSecret)
  return current
}

export function setPaymentProvider(provider: PaymentProvider | null) {
  current = provider
}
