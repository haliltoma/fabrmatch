import { test } from '@japa/runner'
import { variant } from '#tests/contracts/store_adapter_contract'
import {
  StoreApiError,
  StoreWebhookSignatureError,
} from '#services/integrations/stores/store_adapter'
import WixAdapter, { parseSignedInstance } from '#services/integrations/stores/wix_adapter'
import { FakeWix } from '#tests/helpers/fake_shops'

const input = {
  title: 'Spiral vase',
  description: 'Printed on demand',
  imageUrls: [],
  currency: 'EUR',
  variants: [variant('PLA', 'FM-1-PLA', 2500), variant('PETG', 'FM-1-PETG', 2990)],
}

test.group('Wix adapter (Paket V, V8)', (group) => {
  let shop: FakeWix
  group.each.setup(() => {
    shop = new FakeWix()
    shop.useEnv()
    return () => FakeWix.restoreEnv()
  })

  test('a signed instance is only accepted with our app secret, untouched', ({ assert }) => {
    const signed = shop.signedInstance()
    assert.equal(parseSignedInstance(signed, shop.appSecret)?.instanceId, shop.instanceId)
    assert.isNull(parseSignedInstance(signed, 'another-secret'))
    assert.isNull(parseSignedInstance(shop.signedInstance({}, 'another-secret'), shop.appSecret))
    const [signature] = signed.split('.')
    const forged = Buffer.from(JSON.stringify({ instanceId: 'someone-else' })).toString('base64url')
    assert.isNull(parseSignedInstance(`${signature}.${forged}`, shop.appSecret))
    assert.isNull(parseSignedInstance(undefined, shop.appSecret))
  })

  test('verify: the site name and currency; older catalogs and no store are refused', async ({
    assert,
  }) => {
    const adapter = new WixAdapter(shop.http)
    const connection = shop.connection()
    assert.deepEqual(await adapter.verify(connection), {
      shopName: 'Wix Test Site',
      currency: 'EUR',
    })
    // one token for both calls, kept for the next ones
    assert.lengthOf(shop.tokens, 1)
    await adapter.listVariants(connection)
    assert.lengthOf(shop.tokens, 1)

    shop.catalogVersion = 'V1_CATALOG'
    await assert.rejects(() => adapter.verify(connection), /older catalog/)
    shop.catalogVersion = 'STORES_NOT_INSTALLED'
    await assert.rejects(() => adapter.verify(connection), /Add Wix Stores/)
  })

  test('a site that removed our app gets no token', async ({ assert }) => {
    const connection = shop.connection()
    connection.externalShopId = 'not-installed-here'
    await assert.rejects(() => new WixAdapter(shop.http).verify(connection), StoreApiError)
  })

  test('other materials than before: a new product, the old one hidden', async ({ assert }) => {
    const adapter = new WixAdapter(shop.http)
    const connection = shop.connection()
    const first = await adapter.publishProduct(connection, input, null)
    const again = await adapter.publishProduct(
      connection,
      { ...input, variants: [variant('ABS', 'FM-1-ABS', 3100)] },
      first.productId
    )
    assert.notEqual(again.productId, first.productId)
    assert.isFalse(shop.products.get(first.productId)!.visible)
    assert.deepEqual(
      shop.products.get(again.productId)!.variants.map((v) => [v.sku, v.price]),
      [['FM-1-ABS', '31.00']]
    )
  })

  test('variants are listed across pages', async ({ assert }) => {
    shop.pageSize = 1
    const adapter = new WixAdapter(shop.http)
    await adapter.publishProduct(shop.connection(), input, null)
    const variants = await adapter.listVariants(shop.connection())
    assert.deepEqual(
      variants.map((v) => [v.sku, v.title]),
      [
        ['FM-1-PLA', 'Spiral vase — PLA'],
        ['FM-1-PETG', 'Spiral vase — PETG'],
      ]
    )
  })

  test('only paid orders of this site are taken', async ({ assert }) => {
    const adapter = new WixAdapter(shop.http)
    const connection = shop.connection()
    const lines = [{ variantId: 'var-1', sku: 'FM-1-PLA', quantity: 2 }]

    const paid = await adapter.parseOrderWebhook(
      connection,
      shop.paidOrder({ id: 'o-1', number: '10042', lines }),
      {}
    )
    assert.equal(paid?.type, 'paid')
    if (paid?.type === 'paid') {
      assert.equal(paid.order.name, '#10042')
      assert.deepEqual(paid.order.lines, [
        { variantId: 'var-1', sku: 'FM-1-PLA', title: 'Spiral vase', quantity: 2 },
      ])
      assert.deepInclude(paid.order.shippingAddress, {
        fullName: 'Ada Yılmaz',
        line1: 'Atatürk Cd. 1',
        city: 'Istanbul',
        country: 'TR',
      })
    }

    const unpaid = shop.paidOrder({ id: 'o-2', lines, paymentStatus: 'NOT_PAID' })
    assert.isNull(await adapter.parseOrderWebhook(connection, unpaid, {}))

    // signed by Wix, but for another site that happens to send it to this shop
    const elsewhere = shop.webhook('wix.ecom.v1.order_approved', {}, 'another-instance')
    await assert.rejects(
      () => adapter.parseOrderWebhook(connection, elsewhere, {}),
      StoreWebhookSignatureError as never
    )
    await assert.rejects(
      () => adapter.parseOrderWebhook(connection, 'not-a-jwt', {}),
      StoreWebhookSignatureError as never
    )
  })

  test('tracking pushed again after Wix answers "already exists" counts as done', async ({
    assert,
  }) => {
    const adapter = new WixAdapter(shop.http)
    const connection = shop.connection()
    shop.orders.set('o-9', { lineItems: ['li-1'], fulfillmentStatus: 'NOT_FULFILLED' })
    const shipment = { carrier: 'Yurtiçi', trackingNumber: 'YK9' }
    await adapter.pushFulfillment(connection, 'o-9', shipment)
    // as if Wix had not marked the order fulfilled yet
    shop.orders.get('o-9')!.fulfillmentStatus = 'NOT_FULFILLED'
    await adapter.pushFulfillment(connection, 'o-9', shipment)
    assert.lengthOf(shop.fulfillments, 1)
  })

  test('cancelling in Wix does not refund: the seller is asked to', async ({ assert }) => {
    const result = await new WixAdapter(shop.http).cancelOrder(
      shop.connection(),
      'o-5',
      'No maker could print it'
    )
    assert.deepEqual(result, { refunded: false })
    assert.deepEqual(shop.cancelled, [{ orderId: 'o-5', customMessage: 'No maker could print it' }])
  })
})
