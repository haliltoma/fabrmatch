import { createHmac } from 'node:crypto'
import IyzicoClient, {
  authorization,
  fromPrice,
  toPrice,
  type IyzicoCredentials,
  type IyzicoTransport,
} from '#services/payments/iyzico/iyzico_client'
import IyzicoPaymentProvider, {
  IYZICO_SIGNATURE_HEADER,
  type IyzicoSubMerchantInput,
  type SubMerchantDirectory,
} from '#services/payments/iyzico/iyzico_provider'
import { MemoryProviderCallStore } from '#services/payments/iyzico/provider_call_store'

export const IYZICO_TEST_CREDENTIALS: IyzicoCredentials = {
  baseUrl: 'https://sandbox-api.iyzipay.test',
  apiKey: 'sandbox-api-key',
  secretKey: 'sandbox-secret-key',
}

interface FakeItem {
  itemId: string
  paymentTransactionId: string
  price: number
  transactionStatus: number
  subMerchantKey?: string
  subMerchantPrice?: number
}

interface FakePayment {
  token: string
  conversationId: string
  paymentId: string
  state: 'INIT' | 'SUCCESS' | 'FAILURE'
  fraudStatus: number
  priceMinor: number
  paidMinor: number
  currency: string
  basketId: string
  items: FakeItem[]
  refundedMinor: number
}

/**
 * In-memory iyzico: checks the IYZWSv2 signature of every request like the real API does and
 * answers the handful of endpoints the adapter uses, in the documented shapes.
 */
export class FakeIyzico {
  requests: Array<{ method: string; path: string; body: Record<string, unknown> }> = []
  payments = new Map<string, FakePayment>()
  refunds: Array<{ paymentId: string; priceMinor: number; conversationId: string }> = []
  marketplace = true
  private seq = 0

  constructor(private credentials: IyzicoCredentials = IYZICO_TEST_CREDENTIALS) {}

  transport: IyzicoTransport = async ({ method, url, headers, body }) => {
    const path = url.slice(this.credentials.baseUrl.length)
    const payload = JSON.parse(body) as Record<string, any>
    this.requests.push({ method, path, body: payload })
    const answer = (data: object) => ({ status: 200, body: JSON.stringify(data) })
    const fail = (errorCode: string, errorMessage: string) =>
      answer({ status: 'failure', errorCode, errorMessage })

    const rnd = headers['x-iyzi-rnd']
    if (!rnd || headers.Authorization !== authorization(this.credentials, rnd, path, body)) {
      return fail('1000', 'Geçersiz imza')
    }

    switch (`${method} ${path}`) {
      case 'POST /payment/iyzipos/checkoutform/initialize/auth/ecom': {
        const token = `tok_${++this.seq}`
        const items = (payload.basketItems as Array<Record<string, string>>).map((item) => ({
          itemId: item.id,
          paymentTransactionId: `ptx_${++this.seq}`,
          price: fromPrice(item.price),
          transactionStatus: 1,
          subMerchantKey: item.subMerchantKey,
          subMerchantPrice: item.subMerchantPrice ? fromPrice(item.subMerchantPrice) : undefined,
        }))
        const total = items.reduce((sum, item) => sum + item.price, 0)
        if (total !== fromPrice(payload.price)) return fail('5003', 'Sepet tutarı hatalı')
        if (!payload.buyer?.identityNumber || !payload.buyer?.gsmNumber) {
          return fail('12', 'Alıcı bilgileri eksik')
        }
        this.payments.set(token, {
          token,
          conversationId: payload.conversationId,
          paymentId: `${++this.seq}`,
          state: 'INIT',
          fraudStatus: 0,
          priceMinor: total,
          paidMinor: fromPrice(payload.paidPrice),
          currency: payload.currency,
          basketId: payload.basketId,
          items,
          refundedMinor: 0,
        })
        return answer({
          status: 'success',
          token,
          checkoutFormContent: '<script></script>',
          paymentPageUrl: `https://sandbox-cpp.iyzipay.test/?token=${token}`,
        })
      }
      case 'POST /payment/iyzipos/checkoutform/auth/ecom/detail': {
        const payment = this.payments.get(payload.token)
        if (!payment) return fail('5093', 'Token bulunamadı')
        if (payment.state === 'INIT') return fail('5094', 'Ödeme henüz tamamlanmadı')
        if (payment.state === 'FAILURE') {
          return answer({
            status: 'failure',
            errorCode: '10051',
            errorMessage: 'Kart limiti yetersiz',
            paymentStatus: 'FAILURE',
            token: payment.token,
          })
        }
        return answer({
          status: 'success',
          token: payment.token,
          paymentId: payment.paymentId,
          paymentStatus: 'SUCCESS',
          fraudStatus: payment.fraudStatus,
          price: Number(toPrice(payment.priceMinor)),
          paidPrice: Number(toPrice(payment.paidMinor)),
          currency: payment.currency,
          basketId: payment.basketId,
          cardFamily: 'Bonus',
          lastFourDigits: '0008',
          itemTransactions: payment.items.map((item) => ({
            itemId: item.itemId,
            paymentTransactionId: item.paymentTransactionId,
            transactionStatus: item.transactionStatus,
            price: Number(toPrice(item.price)),
            subMerchantKey: item.subMerchantKey,
            subMerchantPrice: item.subMerchantPrice
              ? Number(toPrice(item.subMerchantPrice))
              : undefined,
          })),
        })
      }
      case 'POST /v2/payment/refund': {
        const payment = [...this.payments.values()].find((p) => p.paymentId === payload.paymentId)
        if (!payment || payment.state !== 'SUCCESS') return fail('5092', 'Ödeme bulunamadı')
        const price = fromPrice(payload.price)
        if (payment.refundedMinor + price > payment.paidMinor) {
          return fail('5094', 'İade tutarı ödeme tutarını aşıyor')
        }
        payment.refundedMinor += price
        this.refunds.push({
          paymentId: payment.paymentId,
          priceMinor: price,
          conversationId: payload.conversationId,
        })
        return answer({
          status: 'success',
          paymentId: payment.paymentId,
          price: payload.price,
          hostReference: `host_${++this.seq}`,
        })
      }
      case 'PUT /payment/item':
      case 'POST /payment/iyzipos/item/approve': {
        if (!this.marketplace)
          return fail('2000', 'Bu servis sadece pazaryeri müşterilerine açıktır')
        const item = [...this.payments.values()]
          .flatMap((p) => p.items)
          .find((i) => i.paymentTransactionId === payload.paymentTransactionId)
        if (!item) return fail('5097', 'Ödeme kırılımı bulunamadı')
        if (method === 'PUT') {
          item.subMerchantKey = payload.subMerchantKey
          item.subMerchantPrice = fromPrice(payload.subMerchantPrice)
        } else {
          item.transactionStatus = 2
        }
        return answer({ status: 'success', paymentTransactionId: item.paymentTransactionId })
      }
      case 'POST /onboarding/submerchant': {
        if (!this.marketplace)
          return fail('2000', 'Bu servis sadece pazaryeri müşterilerine açıktır')
        return answer({ status: 'success', subMerchantKey: `sub_${++this.seq}` })
      }
      default:
        return { status: 404, body: 'not found' }
    }
  }

  /** The buyer finishes the card form. */
  complete(
    token: string,
    outcome: { state?: 'SUCCESS' | 'FAILURE'; fraudStatus?: number; paidMinor?: number } = {}
  ) {
    const payment = this.payments.get(token)
    if (!payment) throw new Error(`no checkout ${token}`)
    payment.state = outcome.state ?? 'SUCCESS'
    payment.fraudStatus = outcome.fraudStatus ?? 1
    if (outcome.paidMinor !== undefined) payment.paidMinor = outcome.paidMinor
    return payment
  }

  /** A captured payment that did not go through our checkout (contract tests). */
  seed(token: string, amountMinor: number, paymentId = `${++this.seq}`) {
    this.payments.set(token, {
      token,
      conversationId: token,
      paymentId,
      state: 'SUCCESS',
      fraudStatus: 1,
      priceMinor: amountMinor,
      paidMinor: amountMinor,
      currency: 'TRY',
      basketId: token,
      items: [
        {
          itemId: 'production',
          paymentTransactionId: `ptx_${++this.seq}`,
          price: amountMinor,
          transactionStatus: 1,
        },
      ],
      refundedMinor: 0,
    })
  }

  /** A notification exactly as iyzico's "İşyeri Bildirimleri" sends it (HPP/CF format). */
  webhook(token: string, status: 'SUCCESS' | 'FAILURE' = 'SUCCESS') {
    const payment = this.payments.get(token)
    const body = {
      paymentConversationId: payment?.conversationId ?? token,
      merchantId: '3398045',
      token,
      status,
      iyziReferenceCode: `ref_${token}`,
      iyziEventType: 'CHECKOUT_FORM_AUTH',
      iyziEventTime: 1_700_000_000_000,
      iyziPaymentId: payment?.paymentId ?? '0',
    }
    const secret = this.credentials.secretKey
    const signature = createHmac('sha256', secret)
      .update(
        secret +
          body.iyziEventType +
          body.iyziPaymentId +
          body.token +
          body.paymentConversationId +
          body.status
      )
      .digest('hex')
    return { body: JSON.stringify(body), headers: { [IYZICO_SIGNATURE_HEADER]: signature } }
  }
}

export class MemorySubMerchantDirectory implements SubMerchantDirectory {
  keys = new Map<string, string>()

  async find(type: 'manufacturer' | 'seller', id: number) {
    return this.keys.get(`${type}:${id}`) ?? null
  }

  async save(type: 'manufacturer' | 'seller', id: number, key: string) {
    this.keys.set(`${type}:${id}`, key)
  }

  async details(): Promise<IyzicoSubMerchantInput> {
    return {
      subMerchantType: 'PERSONAL',
      email: 'maker@example.com',
      gsmNumber: '+905350000000',
      address: 'Atatürk Cd. 1, İstanbul',
      contactName: 'Ada',
      contactSurname: 'Yılmaz',
      identityNumber: '10000000146',
      iban: 'TR180006200119000006672315',
    }
  }
}

export function makeIyzico(options: { marketplace?: boolean } = {}) {
  const fake = new FakeIyzico()
  const directory = new MemorySubMerchantDirectory()
  const calls = new MemoryProviderCallStore()
  const provider = new IyzicoPaymentProvider(
    new IyzicoClient(IYZICO_TEST_CREDENTIALS, fake.transport),
    {
      marketplace: options.marketplace ?? false,
      platformSubMerchantKey: 'platform-sub',
      directory,
      calls,
    }
  )
  fake.marketplace = options.marketplace ?? false
  return { provider, fake, directory, calls }
}
