import FakePaymentProvider from '#services/payments/fake_provider'
import { paymentProviderContract } from '#tests/contracts/payment_provider_contract'

paymentProviderContract('fake', () => {
  const provider = new FakePaymentProvider()
  return { provider, signedEvent: (input) => provider.signedEvent(input) }
})
