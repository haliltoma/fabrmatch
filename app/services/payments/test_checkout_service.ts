import { randomBytes } from 'node:crypto'
import DomainError from '#exceptions/domain_error'
import Order from '#models/order'
import Payment from '#models/payment'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import { allowsTestPayments, paymentProvider } from '#services/payments/provider_registry'

export class TestCheckoutError extends DomainError {}

/**
 * The one card the local test payment page accepts. Any future expiry and any 3-digit CVC work;
 * every other number is declined, which is how a failed payment is tested.
 */
export const TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/34',
  cvc: '123',
  name: 'Test Buyer',
} as const

export interface CardInput {
  number: string
  expiry: string
  cvc: string
  name: string
}

export interface ChargeResult {
  status: 'succeeded' | 'declined'
  /** Where the buyer goes back to: their order, or their wallet for a top-up */
  returnUrl: string
}

/**
 * Local stand-in for the provider's hosted payment page (fake provider, never in production). It
 * reads the pending payment from the database, charges the test card and reports the result as a
 * signed webhook through the real `PaymentService.handleWebhook` path, so paid → matching, the
 * ledger and notifications behave exactly as they will with the real provider.
 */
export default class TestCheckoutService {
  constructor(private provider = paymentProvider()) {}

  static enabled(): boolean {
    if (!allowsTestPayments()) return false
    try {
      return paymentProvider() instanceof FakePaymentProvider
    } catch {
      return false
    }
  }

  /** The payment behind a checkout link, for the buyer who owns it (an order or a wallet top-up). */
  async find(providerRef: string, buyerId: string) {
    const payment = await Payment.query()
      .where('providerRef', providerRef)
      .where('provider', 'fake')
      .first()
    if (payment?.walletUserId && payment.walletUserId === buyerId) {
      return {
        payment,
        reference: 'WALLET',
        returnUrl: '/seller/wallet',
        open: payment.status === 'pending',
      }
    }
    const order = payment?.orderId ? await Order.find(payment.orderId) : null
    if (!payment || !order || order.buyerId !== buyerId) {
      throw new TestCheckoutError('Checkout not found', { status: 404 })
    }
    return {
      payment,
      reference: order.code,
      returnUrl: `/orders/${order.id}`,
      open: payment.status === 'pending' && order.status === 'awaiting_payment',
    }
  }

  async charge(providerRef: string, buyerId: string, card: CardInput): Promise<ChargeResult> {
    const { payment, returnUrl, open } = await this.find(providerRef, buyerId)
    if (!open) {
      throw new TestCheckoutError('This checkout is already finished.', { status: 409 })
    }
    this.checkCard(card)

    const approved = card.number.replace(/\D/g, '') === TEST_CARD.number
    await this.report(payment, approved ? 'payment.succeeded' : 'payment.failed')
    return { status: approved ? 'succeeded' : 'declined', returnUrl }
  }

  /** Form mistakes are shown on the form; a well-formed but unknown card is a decline. */
  private checkCard(card: CardInput) {
    const [mm, yy] = card.expiry.split('/').map((p) => Number(p.trim()))
    // valid through the last day of the expiry month
    if (!mm || mm > 12 || Number.isNaN(yy) || new Date(2000 + yy, mm, 1) <= new Date()) {
      throw new TestCheckoutError('The expiry date is in the past or not valid.')
    }
    if (!/^\d{3,4}$/.test(card.cvc.trim())) throw new TestCheckoutError('The CVC is not valid.')
  }

  private async report(payment: Payment, type: 'payment.succeeded' | 'payment.failed') {
    if (!(this.provider instanceof FakePaymentProvider)) {
      throw new TestCheckoutError('Test checkout needs the fake provider', { status: 404 })
    }
    const { body, headers } = this.provider.signedEvent({
      eventId: `evt_test_${randomBytes(6).toString('hex')}`,
      type,
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await new PaymentService(this.provider).handleWebhook(body, headers)
  }
}
