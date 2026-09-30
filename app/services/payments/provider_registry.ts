import env from '#start/env'
import FakePaymentProvider from '#services/payments/fake_provider'
import IyzicoClient from '#services/payments/iyzico/iyzico_client'
import IyzicoPaymentProvider from '#services/payments/iyzico/iyzico_provider'
import DbSubMerchantDirectory from '#services/payments/iyzico/sub_merchant_directory'
import DbProviderCallStore from '#services/payments/iyzico/provider_call_store'
import { PaymentNotConfiguredError, type PaymentProvider } from '#services/payments/provider'
import { salesModel, type SalesModel } from '#services/payments/sales_model'

let current: PaymentProvider | null = null

export interface IyzicoRuntime {
  baseUrl: string | undefined
  apiKey: string | undefined
  secretKey: string | undefined
  marketplace: boolean
  platformSubMerchantKey: string | undefined
}

export interface PaymentRuntime {
  nodeEnv: 'development' | 'production' | 'test'
  /** STAGING=true: a public test server that may take test money only */
  staging?: boolean
  provider: string
  webhookSecret: string | undefined
  iyzico?: IyzicoRuntime
  /** R7: who sells to the buyer; decides whether iyzico's marketplace product is needed */
  salesModel?: SalesModel
}

/**
 * Pure deploy guard (R0-T8): throws unless the payment setup is safe for this environment.
 * The fake provider signs webhooks with a shared secret, so outside dev/test it must never run.
 * iyzico needs its keys; in production also the live endpoint and the marketplace product, since
 * without sub-merchants the platform itself would be holding the buyers' money (PRD §11).
 */
export function assertPaymentConfigured(runtime: PaymentRuntime): void {
  const { nodeEnv, provider, webhookSecret, staging } = runtime
  if (provider === 'fake') {
    if (nodeEnv !== 'development' && nodeEnv !== 'test' && !staging) {
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
  if (provider === 'iyzico') {
    const iyzico = runtime.iyzico
    if (!iyzico?.baseUrl || !iyzico.apiKey || !iyzico.secretKey) {
      throw new PaymentNotConfiguredError(
        'PAYMENT_PROVIDER=iyzico needs IYZICO_BASE_URL, IYZICO_API_KEY and IYZICO_SECRET_KEY'
      )
    }
    if (iyzico.marketplace && !iyzico.platformSubMerchantKey) {
      throw new PaymentNotConfiguredError(
        'IYZICO_MARKETPLACE=true needs IYZICO_PLATFORM_SUBMERCHANT_KEY'
      )
    }
    const model = runtime.salesModel ?? 'merchant_of_record'
    // Fabrmatch as the seller collects its own sales revenue: a plain merchant account is right,
    // sub-merchants would contradict the invoices (docs/legal/satis-ve-fatura-modeli.md)
    if (model === 'merchant_of_record' && iyzico.marketplace) {
      throw new PaymentNotConfiguredError('IYZICO_MARKETPLACE is only for SALES_MODEL=marketplace')
    }
    if (nodeEnv === 'production') {
      if (iyzico.baseUrl.includes('sandbox') && !staging) {
        throw new PaymentNotConfiguredError('The iyzico sandbox is not allowed in production')
      }
      // the maker as seller: the money must sit with iyzico, never with us (6493)
      if (model === 'marketplace' && !iyzico.marketplace) {
        throw new PaymentNotConfiguredError(
          'SALES_MODEL=marketplace needs the iyzico marketplace product (IYZICO_MARKETPLACE=true)'
        )
      }
    }
    return
  }
  throw new PaymentNotConfiguredError(`Payment provider "${provider}" is not implemented yet`)
}

export function currentPaymentRuntime(): PaymentRuntime {
  return {
    nodeEnv: env.get('NODE_ENV'),
    staging: env.get('STAGING', false),
    provider: env.get('PAYMENT_PROVIDER', 'fake'),
    webhookSecret: env.get('PAYMENT_WEBHOOK_SECRET')?.release(),
    salesModel: salesModel(),
    iyzico: {
      baseUrl: env.get('IYZICO_BASE_URL'),
      apiKey: env.get('IYZICO_API_KEY')?.release(),
      secretKey: env.get('IYZICO_SECRET_KEY')?.release(),
      marketplace: env.get('IYZICO_MARKETPLACE', false),
      platformSubMerchantKey: env.get('IYZICO_PLATFORM_SUBMERCHANT_KEY'),
    },
  }
}

/** Single provider instance for the process. Tests swap it with `setPaymentProvider`. */
export function paymentProvider(): PaymentProvider {
  if (current) return current
  const runtime = currentPaymentRuntime()
  assertPaymentConfigured(runtime)
  if (runtime.provider === 'iyzico' && runtime.iyzico) {
    const { baseUrl, apiKey, secretKey, marketplace, platformSubMerchantKey } = runtime.iyzico
    current = new IyzicoPaymentProvider(
      new IyzicoClient({ baseUrl: baseUrl!, apiKey: apiKey!, secretKey: secretKey! }),
      {
        marketplace,
        platformSubMerchantKey,
        directory: new DbSubMerchantDirectory(),
        calls: new DbProviderCallStore(),
      }
    )
    return current
  }
  current = new FakePaymentProvider(runtime.webhookSecret)
  return current
}

export function setPaymentProvider(provider: PaymentProvider | null) {
  current = provider
}
