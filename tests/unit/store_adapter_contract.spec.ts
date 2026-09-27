import StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { storeAdapterContract } from '#tests/contracts/store_adapter_contract'
import ShopifyAdapter from '#services/integrations/stores/shopify_adapter'
import WooCommerceAdapter from '#services/integrations/stores/woocommerce_adapter'
import { FakeShopify, FakeWoo } from '#tests/helpers/fake_shops'

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
    signedCancellation: (id) => adapter.signedCancellation(connection, id),
    onSale: (id) => adapter.published.has(id) && !adapter.unpublished.includes(id),
    shippedTracking: async (id) =>
      adapter.fulfillments.filter((f) => f.externalOrderId === id).map((f) => f.trackingNumber),
  }
})

storeAdapterContract('shopify (in-memory Admin API)', async () => {
  const shop = new FakeShopify()
  const connection = shop.connection()
  return {
    adapter: new ShopifyAdapter(shop.http),
    connection,
    signedOrder: (order) =>
      shop.paidOrder({
        id: Number(order.externalOrderId),
        name: order.name ?? '',
        lines: order.lines.map((l) => ({
          variantId: l.variantId,
          sku: l.sku ?? '',
          quantity: l.quantity,
        })),
      }),
    signedCancellation: (id) => shop.cancelledOrder(Number(id)),
    onSale: (id) => shop.products.get(id)?.status === 'ACTIVE',
    prepareShipment: (id) =>
      shop.fulfillmentOrders.set(id, [
        { id: `gid://shopify/FulfillmentOrder/${id}1`, status: 'OPEN' },
      ]),
    shippedTracking: async (id) =>
      shop.fulfillments.filter((f) => f.orderId === id).map((f) => f.number),
  }
})

storeAdapterContract('woocommerce (in-memory REST API)', async () => {
  const shop = new FakeWoo()
  const connection = shop.connection()
  const encryption = new EncryptionService()
  connection.webhookSecretEnc = encryption.encrypt('woo-webhook-secret')
  return {
    adapter: new WooCommerceAdapter(shop.http),
    connection,
    signedOrder: (order) =>
      shop.orderWebhook('woo-webhook-secret', {
        id: Number(order.externalOrderId),
        status: 'processing',
        lines: order.lines.map((l) => ({
          variationId: Number(l.variantId),
          sku: l.sku ?? '',
          quantity: l.quantity,
        })),
      }),
    signedCancellation: (id) =>
      shop.orderWebhook('woo-webhook-secret', { id: Number(id), status: 'cancelled', lines: [] }),
    onSale: (id) => shop.products.get(Number(id))?.status === 'publish',
    prepareShipment: (id) => shop.orders.set(Number(id), { status: 'processing', notes: [] }),
    shippedTracking: async (id) => {
      const order = shop.orders.get(Number(id))
      return order?.status === 'completed'
        ? order.notes.map((n) => /Tracking number: (\S+)/.exec(n)?.[1] ?? '')
        : []
    },
  }
})
