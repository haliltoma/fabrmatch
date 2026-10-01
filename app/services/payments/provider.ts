import DomainError from '#exceptions/domain_error'

export interface CheckoutBuyer {
  id: string
  name: string
  surname: string
  email: string
  gsmNumber: string
  /** TCKN, asked at the pay step and passed straight through; never stored by us */
  identityNumber: string
  ip: string
}

export interface CheckoutAddress {
  contactName: string
  address: string
  city: string
  country: string
  zipCode?: string
}

export interface CheckoutRequest {
  /** null for a wallet top-up */
  orderId: string | null
  orderCode: string
  amountMinor: number
  currency: string
  buyerEmail: string
  callbackUrl: string
  /** Hosted pages that need the buyer (iyzico) get these; the fake provider ignores them. */
  buyer?: CheckoutBuyer
  shippingAddress?: CheckoutAddress
  /** Payout lines of the order; prices add up to `amountMinor` exactly. */
  items?: Array<{ id: 'production' | 'seller'; name: string; priceMinor: number }>
}

export interface CheckoutResult {
  providerRef: string
  redirectUrl: string
}

export type WebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'refund.succeeded'
  | 'chargeback.opened'
  /** A delivery we recognise but do not act on (recorded for dedup, nothing applied). */
  | 'ignored'

export interface WebhookEvent {
  /** Provider's own event id — the dedup key. */
  eventId: string
  type: WebhookEventType
  providerRef: string
  amountMinor: number
  /** ISO code the provider charged in, when it says (checked against the payment) */
  currency?: string
  raw: Record<string, unknown>
}

export interface ApproveItemRequest {
  providerRef: string
  beneficiaryType: 'manufacturer' | 'seller'
  beneficiaryId: string
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
  beneficiaryId: string
  displayName: string
}

/** PRD §11. Application code depends on this interface only. */
export interface PaymentProvider {
  readonly name: string
  /** ISO codes it can charge and pay out in; TRY only when not declared. */
  readonly supportedCurrencies?: readonly string[]
  /** The hosted page needs the buyer's identity number and phone (asked at the pay step). */
  readonly needsBuyerIdentity?: boolean
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
  /**
   * The buyer came back from a hosted payment page with these fields. Returns the final outcome
   * read from the provider itself (never from the browser), or null while it is not final yet.
   */
  confirmReturn?(fields: Record<string, unknown>): Promise<WebhookEvent | null>
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
