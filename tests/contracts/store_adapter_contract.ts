import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type StoreConnection from '#models/store_connection'
import {
  StoreWebhookSignatureError,
  type IncomingOrder,
  type StoreAdapter,
} from '#services/integrations/stores/store_adapter'

export interface StoreHarness {
  adapter: StoreAdapter
  connection: StoreConnection
  /**
   * Webhook platforms: an order webhook exactly as the platform would sign and send it.
   * Polling platforms (no webhooks) give `placeOrder` / `cancelOrder` instead.
   */
  signedOrder?(order: IncomingOrder): { body: string; headers: Record<string, string> }
  placeOrder?(order: IncomingOrder): void
  cancelOrder?(externalOrderId: string): void
  /** What the shop now shows as shipped for this order, if anything. */
  shippedTracking(externalOrderId: string): Promise<string[]>
  /** A signed delivery saying the shop cancelled this order. */
  signedCancellation?(externalOrderId: string): { body: string; headers: Record<string, string> }
  /** Whether the shop sells this product right now. */
  onSale(productId: string): boolean
  /** Puts an unfulfilled order with this id in the shop. */
  prepareShipment?(externalOrderId: string): void
}

const order: IncomingOrder = {
  externalOrderId: '9001',
  name: '#1',
  lines: [{ variantId: '101', sku: 'SKU-1', title: 'Thing', quantity: 3 }],
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

    test('delivers a paid order (webhook or polling) with its lines and address', async ({
      assert,
    }) => {
      const { adapter, connection, signedOrder, placeOrder } = await make()
      let event
      if (signedOrder) {
        const { body, headers } = signedOrder(order)
        event = await adapter.parseOrderWebhook(connection, body, headers)
      } else {
        placeOrder!(order)
        const events = await adapter.pollOrders!(connection, DateTime.now().minus({ hours: 1 }))
        event = events.find((e) => e.type === 'paid')
      }
      assert.equal(event?.type, 'paid')
      const parsed = event?.type === 'paid' ? event.order : null
      assert.isNotNull(parsed)
      assert.equal(parsed!.externalOrderId, '9001')
      assert.equal(parsed!.lines[0].variantId, '101')
      assert.equal(parsed!.lines[0].quantity, 3)
      assert.match(parsed!.shippingAddress.country, /^[A-Z]{2}$/)
      assert.isNotEmpty(parsed!.shippingAddress.fullName)
    })

    test('refuses a tampered or unsigned delivery', async ({ assert }) => {
      const { adapter, connection, signedOrder } = await make()
      if (!signedOrder) {
        // polling platforms never accept anything on the webhook endpoint
        await assert.rejects(
          () => adapter.parseOrderWebhook(connection, '{}', {}),
          StoreWebhookSignatureError as never
        )
        return
      }
      const { body, headers } = signedOrder(order)
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

    test('a cancellation is recognised as one', async ({ assert }) => {
      const { adapter, connection, signedCancellation, cancelOrder } = await make()
      if (signedCancellation) {
        const { body, headers } = signedCancellation('9003')
        const event = await adapter.parseOrderWebhook(connection, body, headers)
        assert.deepEqual(event, { type: 'cancelled', externalOrderId: '9003' })
      } else {
        cancelOrder!('9003')
        const events = await adapter.pollOrders!(connection, DateTime.now().minus({ hours: 1 }))
        assert.deepInclude(events, { type: 'cancelled', externalOrderId: '9003' })
      }
    })

    test('writing the same tracking twice leaves one shipment', async ({ assert }) => {
      const { adapter, connection, shippedTracking, prepareShipment } = await make()
      prepareShipment?.('9002')
      const shipment = { carrier: 'Yurtiçi', trackingNumber: 'YK1' }
      await adapter.pushFulfillment(connection, '9002', shipment)
      await adapter.pushFulfillment(connection, '9002', shipment)
      assert.deepEqual(await shippedTracking('9002'), ['YK1'])
    })

    test('publishing twice updates the same product; taking it off sale keeps it', async ({
      assert,
    }) => {
      const { adapter, connection, onSale } = await make()
      const input = {
        title: 'Spiral vase',
        description: 'Printed on demand',
        imageUrls: [],
        images: [
          {
            bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            contentType: 'image/png',
          },
        ],
        categoryId: '1029',
        currency: 'TRY',
        variants: [
          { material: 'PLA', sku: 'FM-1-PLA', priceMinor: 25_000 },
          { material: 'PETG', sku: 'FM-1-PETG', priceMinor: 29_900 },
        ],
      }
      const first = await adapter.publishProduct(connection, input, null)
      assert.lengthOf(first.variants, 2)
      const again = await adapter.publishProduct(
        connection,
        { ...input, variants: [{ ...input.variants[0], priceMinor: 26_000 }, input.variants[1]] },
        first.productId
      )
      assert.equal(again.productId, first.productId)
      const ids = (r: typeof first) =>
        Object.fromEntries(r.variants.map((v) => [v.sku, v.variantId]))
      assert.deepEqual(ids(again), ids(first))
      assert.isTrue(onSale(first.productId))
      await adapter.unpublishProduct(connection, first.productId)
      assert.isFalse(onSale(first.productId))
      const variants = await adapter.listVariants(connection)
      assert.includeMembers(
        variants.map((v) => v.sku),
        ['FM-1-PLA', 'FM-1-PETG']
      )
    })
  })
}
