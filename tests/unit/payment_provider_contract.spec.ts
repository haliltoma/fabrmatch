import FakePaymentProvider from '#services/payments/fake_provider'
import { paymentProviderContract } from '#tests/contracts/payment_provider_contract'
import { makeIyzico } from '#tests/helpers/fake_iyzico'
import { uid } from '#tests/helpers/ids'

paymentProviderContract('fake', () => {
  const provider = new FakePaymentProvider()
  return { provider, signedEvent: (input) => provider.signedEvent(input) }
})

paymentProviderContract('iyzico (in-memory API)', () => {
  const { provider, fake, directory } = makeIyzico({ marketplace: true })
  directory.keys.set(`manufacturer:${uid(7)}`, 'maker-sub')
  return {
    provider,
    signedEvent: ({ eventId, type, providerRef, amountMinor }) => {
      fake.seed(providerRef, amountMinor, eventId)
      if (type === 'payment.failed') fake.complete(providerRef, { state: 'FAILURE' })
      return fake.webhook(providerRef, type === 'payment.failed' ? 'FAILURE' : 'SUCCESS')
    },
    tamper: (body) => body.replace('"SUCCESS"', '"FAILURE"'),
    paidCheckout: (providerRef, amountMinor) => fake.seed(providerRef, amountMinor),
  }
})
