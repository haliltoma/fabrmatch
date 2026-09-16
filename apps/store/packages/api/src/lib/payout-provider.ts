import { randomUUID } from "crypto"
import Stripe from "stripe"

/**
 * 05-PRD-ODEME-VE-KOMISYON: üretici ödeme transferini soyutlar. `manual` (varsayılan,
 * `STRIPE_SECRET_KEY` tanımlı değilse) anında başarı simüle eder — tıpkı checkout'ta
 * `pp_system_default`'ın gerçek bir ödeme sağlayıcısı olmadan akışı test etmeyi
 * sağlaması gibi. Gerçek anahtar tanımlandığında `stripe-connect` gerçek transfer yapar.
 */

export type PayoutRequest = {
  /** TRY gibi ana birim, kuruşa ÇEVRİLMEMİŞ (Medusa/proje konvansiyonu) */
  amount: number
  currencyCode: string
  accountId: string
  /** İlişkili transferleri gruplamak için (Stripe transfer_group) — burada sipariş ID'si */
  transferGroup: string
  /** Aynı talimat ikinci kez denenirse Stripe'ın çift transfer yapmaması için */
  idempotencyKey: string
}

export type PayoutResult = { ok: true; providerReference: string } | { ok: false; error: string }

export interface PayoutProvider {
  readonly name: "manual" | "stripe-connect"
  payout(request: PayoutRequest): Promise<PayoutResult>
}

// https://docs.stripe.com/currencies#zero-decimal — Fabrmatch şu an sadece TRY/EUR/USD
// kullanıyor (hepsi 2 ondalıklı) ama liste ileride başka para birimi eklenirse doğru kalsın diye tutulur
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg",
  "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
])

export function toMinorUnits(amount: number, currencyCode: string): number {
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(currencyCode.toLowerCase()) ? 1 : 100
  return Math.round(amount * multiplier)
}

export const manualPayoutProvider: PayoutProvider = {
  name: "manual",
  async payout() {
    return { ok: true, providerReference: `manual_${randomUUID()}` }
  },
}

export function createStripeConnectPayoutProvider(stripe: Stripe): PayoutProvider {
  return {
    name: "stripe-connect",
    async payout(request) {
      try {
        const transfer = await stripe.transfers.create(
          {
            amount: toMinorUnits(request.amount, request.currencyCode),
            currency: request.currencyCode.toLowerCase(),
            destination: request.accountId,
            transfer_group: request.transferGroup,
          },
          { idempotencyKey: request.idempotencyKey }
        )
        return { ok: true, providerReference: transfer.id }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  }
}

let cachedProvider: PayoutProvider | null = null

export function getPayoutProvider(): PayoutProvider {
  if (cachedProvider) {
    return cachedProvider
  }
  const secretKey = process.env.STRIPE_SECRET_KEY
  cachedProvider = secretKey
    ? createStripeConnectPayoutProvider(new Stripe(secretKey))
    : manualPayoutProvider
  return cachedProvider
}

/** Testlerde sağlayıcıyı değiştirmek için (ör. sahte bir Stripe istemcisi ile). */
export function setPayoutProviderForTesting(provider: PayoutProvider | null) {
  cachedProvider = provider
}

// 05-PRD escrow hedefi: "ödeme, teslimat onaylanana kadar tutulsun". Alıcı hesabı henüz
// yok (Faz 4'te ertelendi), bu yüzden onay örtük: pencere boyunca anlaşmazlık açılmazsa
// otomatik serbest bırakılır (bkz. release-due-payouts job, [[07-KARAR-GECMISI]] 2026-09-16).
export const PAYOUT_RELEASE_WINDOW_HOURS = Number(process.env.PAYOUT_RELEASE_WINDOW_HOURS ?? 48)

export function computeReleaseAt(deliveredAt: Date): Date {
  return new Date(deliveredAt.getTime() + PAYOUT_RELEASE_WINDOW_HOURS * 60 * 60 * 1000)
}
