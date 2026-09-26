import { createHmac } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import DomainError from '#exceptions/domain_error'
import type IyzicoClient from '#services/payments/iyzico/iyzico_client'
import { IyzicoError, fromPrice, sameHex, toPrice } from '#services/payments/iyzico/iyzico_client'
import {
  InvalidWebhookSignatureError,
  type ApproveItemRequest,
  type CheckoutAddress,
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type RefundRequest,
  type RegisterSubMerchantRequest,
  type WebhookEvent,
} from '#services/payments/provider'
import type { ProviderCallStore } from '#services/payments/iyzico/provider_call_store'

export const IYZICO_SIGNATURE_HEADER = 'x-iyz-signature-v3'

const CF_INITIALIZE = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
const CF_RETRIEVE = '/payment/iyzipos/checkoutform/auth/ecom/detail'

/** Fields of an iyzico sub-merchant (docs: "Alt Üye Oluşturma"). */
export interface IyzicoSubMerchantInput {
  subMerchantType: 'PERSONAL' | 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY'
  email: string
  gsmNumber: string
  address: string
  contactName: string
  contactSurname: string
  identityNumber?: string
  iban?: string
  name?: string
  taxOffice?: string
  taxNumber?: string
  legalCompanyTitle?: string
}

/** Where sub-merchant keys live, and the onboarding details of a beneficiary. */
export interface SubMerchantDirectory {
  find(type: 'manufacturer' | 'seller', id: number): Promise<string | null>
  save(type: 'manufacturer' | 'seller', id: number, key: string): Promise<void>
  details(type: 'manufacturer' | 'seller', id: number): Promise<IyzicoSubMerchantInput>
}

export interface IyzicoOptions {
  /** iyzico's marketplace product is active on the account (sub-merchants, approve). */
  marketplace: boolean
  /** Our own sub-merchant that holds basket items until the maker is known. */
  platformSubMerchantKey?: string | null
  directory: SubMerchantDirectory
  /** Refunds and approvals reach iyzico at most once per idempotency key. */
  calls: ProviderCallStore
}

interface ItemTransaction {
  itemId: string
  paymentTransactionId: string
  transactionStatus?: number
  subMerchantKey?: string
  subMerchantPrice?: number | string
}

interface CheckoutFormResult {
  status: string
  token?: string
  paymentId?: string
  paymentStatus?: string
  fraudStatus?: number
  price?: number | string
  paidPrice?: number | string
  currency?: string
  basketId?: string
  errorCode?: string
  errorMessage?: string
  itemTransactions?: ItemTransaction[]
}

/** iyzico's "approved" item transaction status: the money is released to the sub-merchant. */
const APPROVED = 2

/**
 * iyzico adapter (R1-T1), built from docs.iyzico.com:
 * - checkout is the hosted Checkout Form; the CF token is our `providerRef`
 * - the truth about a payment always comes from CF retrieve, never from the browser or the
 *   webhook body (which carries no amount), so callback and webhook produce the same event id and
 *   the payment is applied exactly once
 * - marketplace calls (sub-merchant, item update, approve) run only when the account has the
 *   marketplace product; until then payouts are recorded by us and paid outside iyzico
 */
export default class IyzicoPaymentProvider implements PaymentProvider {
  readonly name = 'iyzico'
  readonly supportedCurrencies = ['TRY', 'USD', 'EUR', 'GBP'] as const
  readonly needsBuyerIdentity = true

  constructor(
    private client: IyzicoClient,
    private options: IyzicoOptions
  ) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const { buyer, shippingAddress } = request
    if (!buyer || !shippingAddress) {
      throw new DomainError('iyzico checkout needs the buyer and the shipping address', {
        status: 422,
      })
    }
    const items = (
      request.items ?? [
        { id: 'production' as const, name: request.orderCode, priceMinor: request.amountMinor },
      ]
    ).filter((item) => item.priceMinor > 0)
    const sum = items.reduce((total, item) => total + item.priceMinor, 0)
    if (sum !== request.amountMinor) {
      throw new Error(`basket ${sum} does not add up to ${request.amountMinor}`)
    }
    if (this.options.marketplace && !this.options.platformSubMerchantKey) {
      throw new DomainError('IYZICO_PLATFORM_SUBMERCHANT_KEY is required in marketplace mode')
    }

    const address = iyzicoAddress(shippingAddress)
    const data = await this.client.post<{ token: string; paymentPageUrl: string }>(CF_INITIALIZE, {
      locale: 'tr',
      conversationId: request.orderCode,
      price: toPrice(request.amountMinor),
      paidPrice: toPrice(request.amountMinor),
      currency: request.currency,
      basketId: request.orderCode,
      paymentGroup: 'PRODUCT',
      callbackUrl: request.callbackUrl,
      // single payment only: paidPrice must stay equal to the order total
      enabledInstallments: [1],
      buyer: {
        id: buyer.id,
        name: buyer.name,
        surname: buyer.surname,
        identityNumber: buyer.identityNumber,
        email: buyer.email,
        gsmNumber: buyer.gsmNumber,
        registrationAddress: address.address,
        city: address.city,
        country: address.country,
        zipCode: address.zipCode,
        ip: buyer.ip,
      },
      shippingAddress: address,
      billingAddress: address,
      basketItems: items.map((item) => ({
        id: item.id,
        name: item.name,
        category1: '3D printing',
        itemType: 'PHYSICAL',
        price: toPrice(item.priceMinor),
        // pay first, match later: our own sub-merchant holds it until the maker is known
        ...(this.options.marketplace
          ? {
              subMerchantKey: this.options.platformSubMerchantKey,
              subMerchantPrice: toPrice(item.priceMinor),
            }
          : {}),
      })),
    })
    return { providerRef: data.token, redirectUrl: data.paymentPageUrl }
  }

  /** iyzico POSTs `token` to our callback after the card form; the result is read back from iyzico. */
  async confirmReturn(fields: Record<string, unknown>): Promise<WebhookEvent | null> {
    const token = typeof fields.token === 'string' ? fields.token.trim() : ''
    if (!token) throw new DomainError('Missing payment token', { status: 400 })
    return this.lookup(token)
  }

  /**
   * Final state of a checkout, straight from iyzico; null while it is not final. Verified against
   * the sandbox: a declined card answers `status: failure, paymentStatus: FAILURE`, a token
   * without a payment answers `status: failure` and no paymentStatus.
   */
  async lookup(token: string): Promise<WebhookEvent | null> {
    const data = await this.retrieve(token)
    const raw = summary(data, token)

    if (data.paymentStatus === 'FAILURE' || data.fraudStatus === -1) {
      return {
        eventId: `${token}:failed`,
        type: 'payment.failed',
        providerRef: token,
        amountMinor: 0,
        raw,
      }
    }
    // no payment behind the token yet (form still open or abandoned): nothing to decide
    if (data.status !== 'success') return null
    if (data.paymentStatus !== 'SUCCESS' || data.fraudStatus !== 1 || !data.paymentId) return null
    return {
      eventId: `${data.paymentId}:succeeded`,
      type: 'payment.succeeded',
      providerRef: token,
      amountMinor: fromPrice(data.paidPrice ?? '0'),
      currency: data.currency,
      raw,
    }
  }

  /**
   * iyzico "İşyeri Bildirimleri" (HPP/Checkout Form format). The X-IYZ-SIGNATURE-V3 header is
   * required; the body only says which token changed, the outcome is read back from iyzico.
   */
  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<WebhookEvent> {
    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      throw new InvalidWebhookSignatureError()
    }
    const field = (name: string) =>
      body[name] === undefined || body[name] === null ? '' : String(body[name])
    const token = field('token')
    const message = token
      ? field('iyziEventType') +
        field('iyziPaymentId') +
        token +
        field('paymentConversationId') +
        field('status')
      : field('iyziEventType') +
        field('paymentId') +
        field('paymentConversationId') +
        field('status')
    const expected = createHmac('sha256', this.client.credentials.secretKey)
      .update(this.client.credentials.secretKey + message)
      .digest('hex')
    if (!sameHex(headers[IYZICO_SIGNATURE_HEADER] ?? '', expected)) {
      throw new InvalidWebhookSignatureError()
    }

    // only Checkout Form payments are ours to apply; anything else is recorded and left alone
    if (!token) {
      return {
        eventId: `ignored:${field('iyziEventType')}:${field('iyziReferenceCode') || field('paymentId')}`,
        type: 'ignored',
        providerRef: field('paymentId'),
        amountMinor: 0,
        raw: body,
      }
    }
    const event = await this.lookup(token)
    if (!event) throw new DomainError('Payment is not final yet', { status: 409 })
    return event
  }

  /**
   * Releases one payout. Marketplace: routes the basket item to the beneficiary's sub-merchant
   * with their share (PUT /payment/item) and approves it; already-approved items are skipped, so
   * a retry never pays twice. Without marketplace nothing moves at iyzico.
   */
  async approveItem(request: ApproveItemRequest) {
    if (!this.options.marketplace) {
      logger.warn({
        msg: 'iyzico marketplace is off: payout recorded, pay it outside iyzico',
        key: request.idempotencyKey,
      })
      return { providerRef: `manual:${request.idempotencyKey}` }
    }
    const subMerchantKey = await this.options.directory.find(
      request.beneficiaryType,
      request.beneficiaryId
    )
    if (!subMerchantKey) {
      throw new DomainError(
        `No iyzico sub-merchant for ${request.beneficiaryType} ${request.beneficiaryId}`
      )
    }
    const data = await this.retrieve(request.providerRef)
    if (data.status !== 'success') {
      throw new IyzicoError(data.errorMessage ?? 'iyzico retrieve failed', data.errorCode ?? null)
    }
    const itemId = request.beneficiaryType === 'manufacturer' ? 'production' : 'seller'
    const item = data.itemTransactions?.find((transaction) => transaction.itemId === itemId)
    if (!item) throw new DomainError(`Payment has no "${itemId}" item to pay out`)
    if (item.transactionStatus === APPROVED) return { providerRef: item.paymentTransactionId }

    const price = toPrice(request.amountMinor)
    if (
      item.subMerchantKey !== subMerchantKey ||
      fromPrice(item.subMerchantPrice ?? '0') !== request.amountMinor
    ) {
      await this.client.put('/payment/item', {
        locale: 'tr',
        conversationId: request.idempotencyKey,
        paymentTransactionId: item.paymentTransactionId,
        subMerchantKey,
        subMerchantPrice: price,
      })
    }
    await this.client.post('/payment/iyzipos/item/approve', {
      locale: 'tr',
      conversationId: request.idempotencyKey,
      paymentTransactionId: item.paymentTransactionId,
    })
    return { providerRef: item.paymentTransactionId }
  }

  /**
   * Partial or full refund of a Checkout Form payment (v2: by paymentId). iyzico has no
   * idempotency key, so the call store makes sure a retry with the same key never refunds twice.
   */
  async refund(request: RefundRequest) {
    const refundRef = await this.options.calls.once(
      `refund:${request.idempotencyKey}`,
      async () => {
        const data = await this.retrieve(request.providerRef)
        if (data.status !== 'success' || !data.paymentId) {
          throw new IyzicoError(
            data.errorMessage ?? 'payment to refund not found',
            data.errorCode ?? null
          )
        }
        const result = await this.client.post<{ paymentId?: string; hostReference?: string }>(
          '/v2/payment/refund',
          {
            locale: 'tr',
            conversationId: request.idempotencyKey,
            paymentId: data.paymentId,
            price: toPrice(request.amountMinor),
            currency: request.currency,
          }
        )
        return result.hostReference ?? `${data.paymentId}:${request.idempotencyKey}`
      }
    )
    return { refundRef }
  }

  async registerSubMerchant(request: RegisterSubMerchantRequest) {
    if (!this.options.marketplace) {
      throw new DomainError('iyzico marketplace is not enabled on this account')
    }
    const { directory } = this.options
    const existing = await directory.find(request.beneficiaryType, request.beneficiaryId)
    if (existing) return { subMerchantKey: existing }

    const details = await directory.details(request.beneficiaryType, request.beneficiaryId)
    const data = await this.client.post<{ subMerchantKey: string }>('/onboarding/submerchant', {
      locale: 'tr',
      conversationId: `${request.beneficiaryType}:${request.beneficiaryId}`,
      subMerchantExternalId: `${request.beneficiaryType}-${request.beneficiaryId}`,
      name: details.name ?? request.displayName,
      currency: 'TRY',
      ...details,
    })
    await directory.save(request.beneficiaryType, request.beneficiaryId, data.subMerchantKey)
    return { subMerchantKey: data.subMerchantKey }
  }

  private async retrieve(token: string) {
    return this.client.post<CheckoutFormResult>(
      CF_RETRIEVE,
      { locale: 'tr', conversationId: token, token },
      { allowFailure: true }
    )
  }
}

function iyzicoAddress(address: CheckoutAddress) {
  return {
    contactName: address.contactName,
    address: address.address,
    city: address.city,
    country: countryName(address.country),
    zipCode: address.zipCode,
  }
}

/** iyzico takes a country name ("Turkey"), our addresses carry ISO codes. */
function countryName(code: string) {
  if (code.toUpperCase() === 'TR') return 'Turkey'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** What we keep of a retrieve answer: identifiers and amounts, no card data. */
function summary(data: CheckoutFormResult, token: string): Record<string, unknown> {
  return {
    token,
    paymentId: data.paymentId ?? null,
    paymentStatus: data.paymentStatus ?? null,
    fraudStatus: data.fraudStatus ?? null,
    price: data.price ?? null,
    paidPrice: data.paidPrice ?? null,
    currency: data.currency ?? null,
    basketId: data.basketId ?? null,
    errorCode: data.errorCode ?? null,
    items: (data.itemTransactions ?? []).map((item) => ({
      itemId: item.itemId,
      paymentTransactionId: item.paymentTransactionId,
    })),
  }
}
