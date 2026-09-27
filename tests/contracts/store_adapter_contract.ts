import { test } from '@japa/runner'
import type StoreConnection from '#models/store_connection'
import {
  StoreWebhookSignatureError,
  type IncomingOrder,
  type StoreAdapter,
} from '#services/integrations/stores/store_adapter'

export interface StoreHarness {
  adapter: StoreAdapter
  connection: StoreConnection
  /** An order webhook exactly as the platform would sign and send it. */
  signedOrder(order: IncomingOrder): { body: string; headers: Record<string, string> }
  /** What the shop now shows as shipped for this order, if anything. */
  shippedTracking(externalOrderId: string): Promise<string[]>
}

const order: IncomingOrder = {
  externalOrderId: 'contract-1',
  name: '#1',
  lines: [{ variantId: 'v1', sku: 'SKU-1', title: 'Thing', quantity: 3 }],
  shippingAddress: {
    fullName: 'Ada Yılmaz',
    line1: 'Atatürk Cd. 1',
    city: 'Istanbul',
    postalCode: '34000',
    country: 'TR',
  },
}

/** Every store adapter (fake, Shopify R4-T1, Etsy R4-T5) must pass this same suite. */
export function storeAdapterContract(label: string, make: () => Promise<StoreHarness>) {
  test.group(`StoreAdapter contract: ${label}`, () => {
    test('lists variants with ids and titles', async ({ assert }) => {
      const { adapter, connection } = await make()
      const variants = await adapter.listVariants(connection)
      for (const v of variants) {
        assert.isString(v.variantId)
        assert.isNotEmpty(v.title)
      }
    })

    test('parses a signed order webhook and refuses a tampered or unsigned one', async ({
      assert,
    }) => {
      const { adapter, connection, signedOrder } = await make()
      const { body, headers } = signedOrder(order)
      const parsed = await adapter.parseOrderWebhook(connection, body, headers)
      assert.equal(parsed.externalOrderId, 'contract-1')
      assert.equal(parsed.lines[0].quantity, 3)
      assert.equal(parsed.shippingAddress.country, 'TR')

      await assert.rejects(
        () =>
          adapter.parseOrderWebhook(
            connection,
            body.replace('"quantity":3', '"quantity":30'),
            headers
          ),
        StoreWebhookSignatureError as never
      )
      await assert.rejects(
        () => adapter.parseOrderWebhook(connection, body, {}),
        StoreWebhookSignatureError as never
      )
    })

    test('writing the same tracking twice leaves one shipment', async ({ assert }) => {
      const { adapter, connection, shippedTracking } = await make()
      const shipment = { carrier: 'Yurtiçi', trackingNumber: 'YK1' }
      await adapter.pushFulfillment(connection, 'contract-2', shipment)
      await adapter.pushFulfillment(connection, 'contract-2', shipment)
      assert.deepEqual(await shippedTracking('contract-2'), ['YK1'])
    })
  })
}
