import DomainError from '#exceptions/domain_error'

export interface CheckoutRequest {
  orderId: number
  orderCode: string
  amountMinor: number
  currency: string
  buyerEmail: string
  callbackUrl: string
}

export interface CheckoutResult {
  providerRef: string
  redirectUrl: string
}

export type WebhookEventType =
  'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'chargeback.opened'

export interface WebhookEvent {
  /** Provider's own event id — the dedup key. */
  eventId: string
  type: WebhookEventType
  providerRef: string
  amountMinor: number
  raw: Record<string, unknown>
}

export interface ApproveItemRequest {
  providerRef: string
  beneficiaryType: 'manufacturer' | 'seller'
  beneficiaryId: number
  amountMinor: number
  currency: string
  /** Same key → same result, never a second transfer. */
  idempotencyKey: string
}

export interface RefundRequest {
  providerRef: string
  amountMinor: number
  currency: string
  idempotencyKey: string
}

export interface RegisterSubMerchantRequest {
  beneficiaryType: 'manufacturer' | 'seller'
  beneficiaryId: number
  displayName: string
}

/** PRD §11. Application code depends on this interface only. */
export interface PaymentProvider {
  readonly name: string
  /** ISO codes it can charge and pay out in; TRY only when not declared. */
  readonly supportedCurrencies?: readonly string[]
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
  /** Verifies the signature and parses the body. Throws InvalidWebhookSignatureError. */
  handleWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<WebhookEvent>
  /** Releases escrowed funds for one item to its sub-merchant. */
  approveItem(request: ApproveItemRequest): Promise<{ providerRef: string }>
  refund(request: RefundRequest): Promise<{ refundRef: string }>
  registerSubMerchant(request: RegisterSubMerchantRequest): Promise<{ subMerchantKey: string }>
}

export class InvalidWebhookSignatureError extends DomainError {
  constructor() {
    super('Invalid webhook signature', { status: 401 })
  }
}

export class PaymentNotConfiguredError extends DomainError {}
