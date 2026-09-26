import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  InvalidWebhookSignatureError,
  type ApproveItemRequest,
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type RefundRequest,
  type RegisterSubMerchantRequest,
  type WebhookEvent,
  type WebhookEventType,
} from '#services/payments/provider'

export const FAKE_SIGNATURE_HEADER = 'x-fake-signature'

/** Deterministic in-memory provider for tests and local development. */
export default class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake'
  readonly supportedCurrencies = ['TRY', 'USD', 'EUR', 'GBP'] as const

  checkouts: Array<CheckoutRequest & CheckoutResult> = []
  approvals: ApproveItemRequest[] = []
  refunds: RefundRequest[] = []
  failApprovals = false
  failRefunds = false

  private approvalResults = new Map<string, { providerRef: string }>()
  private refundResults = new Map<string, { refundRef: string }>()

  constructor(private secret: string = 'fake-secret') {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const providerRef = `fake_pay_${randomBytes(6).toString('hex')}`
    // the local test payment page stands in for the provider's hosted checkout; relative, so it
    // works on whatever host the site was opened on (localhost, LAN IP)
    const result = { providerRef, redirectUrl: `/dev/checkout/${providerRef}` }
    this.checkouts.push({ ...request, ...result })
    return result
  }

  /** Builds a correctly signed webhook delivery — what the real provider would POST. */
  signedEvent(input: {
    eventId?: string
    type: WebhookEventType
    providerRef: string
    amountMinor: number
  }) {
    const body = JSON.stringify({
      eventId: input.eventId ?? `evt_${randomBytes(6).toString('hex')}`,
      type: input.type,
      providerRef: input.providerRef,
      amountMinor: input.amountMinor,
    })
    return { body, headers: { [FAKE_SIGNATURE_HEADER]: this.sign(body) } }
  }

  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<WebhookEvent> {
    const given = headers[FAKE_SIGNATURE_HEADER] ?? ''
    const expected = this.sign(rawBody)
    const a = Buffer.from(given)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new InvalidWebhookSignatureError()

    const parsed = JSON.parse(rawBody) as Record<string, unknown>
    return {
      eventId: String(parsed.eventId),
      type: parsed.type as WebhookEventType,
      providerRef: String(parsed.providerRef),
      amountMinor: Number(parsed.amountMinor),
      raw: parsed,
    }
  }

  async approveItem(request: ApproveItemRequest) {
    if (this.failApprovals) throw new Error('fake provider: approval failed')
    const previous = this.approvalResults.get(request.idempotencyKey)
    if (previous) return previous
    const result = { providerRef: `fake_appr_${randomBytes(6).toString('hex')}` }
    this.approvalResults.set(request.idempotencyKey, result)
    this.approvals.push(request)
    return result
  }

  async refund(request: RefundRequest) {
    if (this.failRefunds) throw new Error('fake provider: refund failed')
    const previous = this.refundResults.get(request.idempotencyKey)
    if (previous) return previous
    const result = { refundRef: `fake_ref_${randomBytes(6).toString('hex')}` }
    this.refundResults.set(request.idempotencyKey, result)
    this.refunds.push(request)
    return result
  }

  async registerSubMerchant(request: RegisterSubMerchantRequest) {
    return { subMerchantKey: `fake_sub_${request.beneficiaryType}_${request.beneficiaryId}` }
  }

  private sign(body: string) {
    return createHmac('sha256', this.secret).update(body).digest('hex')
  }
}
