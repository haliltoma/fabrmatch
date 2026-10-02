import StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { storeAdapterContract } from '#tests/contracts/store_adapter_contract'
import ShopifyAdapter from '#services/integrations/stores/shopify_adapter'
import WooCommerceAdapter from '#services/integrations/stores/woocommerce_adapter'
import { FakeEtsy, FakeShopify, FakeWix, FakeWoo } from '#tests/helpers/fake_shops'
import WixAdapter from '#services/integrations/stores/wix_adapter'
import EtsyAdapter from '#services/integrations/stores/etsy_adapter'
import env from '#start/env'
import { Secret } from '@adonisjs/core/helpers'

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

storeAdapterContract('etsy (in-memory Open API v3, polling)', async () => {
  const shop = new FakeEtsy()
  env.set('ETSY_KEYSTRING', shop.keystring)
  env.set('ETSY_SHARED_SECRET', new Secret(shop.sharedSecret) as never)
  const connection = shop.connection()
  return {
    adapter: new EtsyAdapter(shop.http),
    connection,
    placeOrder: (order) =>
      shop.receipt(
        Number(order.externalOrderId),
        order.lines.map((l) => ({ productId: l.variantId, sku: l.sku, quantity: l.quantity }))
      ),
    cancelOrder: (id) => shop.receipt(Number(id), [], 'canceled'),
    prepareShipment: (id) => shop.receipt(Number(id), []),
    shippedTracking: async (id) =>
      (shop.receipts.get(Number(id))?.shipments ?? []).map((s: any) => s.tracking_code),
    onSale: (id) => shop.listings.get(Number(id))?.state === 'active',
  }
})

storeAdapterContract('wix (in-memory Catalog V3 + eCommerce)', async () => {
  const shop = new FakeWix()
  shop.useEnv()
  return {
    adapter: new WixAdapter(shop.http),
    connection: shop.connection(),
    signedOrder: (order) => ({
      body: shop.paidOrder({
        id: order.externalOrderId,
        number: order.name?.replace('#', ''),
        lines: order.lines.map((l) => ({
          variantId: l.variantId,
          sku: l.sku ?? '',
          quantity: l.quantity,
        })),
      }),
      headers: {},
    }),
    tamper: (body) =>
      shop.tamper(body, (event) => {
        event.actionEvent.body.order.lineItems[0].quantity = 30
      }),
    signedCancellation: (id) => ({ body: shop.cancelledOrder(id), headers: {} }),
    onSale: (id) => shop.products.get(id)?.visible === true,
    prepareShipment: (id) =>
      shop.orders.set(id, { lineItems: ['li-1'], fulfillmentStatus: 'NOT_FULFILLED' }),
    shippedTracking: async (id) =>
      shop.fulfillments.filter((f) => f.orderId === id).map((f) => f.trackingNumber),
  }
})
