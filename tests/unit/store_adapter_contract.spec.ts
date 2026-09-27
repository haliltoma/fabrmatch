import StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { storeAdapterContract } from '#tests/contracts/store_adapter_contract'

storeAdapterContract('fake', async () => {
  const adapter = new FakeStoreAdapter()
  // not saved: the adapter only reads the secret
  const connection = new StoreConnection().merge({
    provider: 'fake',
    shopName: 'Contract shop',
    externalShopId: 'contract',
    webhookSecretEnc: new EncryptionService().encrypt('contract-secret'),
  })
  return {
    adapter,
    connection,
    signedOrder: (order) => adapter.signedOrder(connection, order),
    shippedTracking: async (id) =>
      adapter.fulfillments.filter((f) => f.externalOrderId === id).map((f) => f.trackingNumber),
  }
})
