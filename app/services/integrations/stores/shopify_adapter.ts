import { createHmac, timingSafeEqual } from 'node:crypto'
import { DateTime } from 'luxon'
import type StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import {
  StoreApiError,
  StoreWebhookSignatureError,
  decimalPrice,
  descriptionHtml,
  variantOptions,
  type StoreEvent,
  type PublishInput,
  type PublishResult,
  type StoreAdapter,
  type StoreVariant,
} from '#services/integrations/stores/store_adapter'
import { safeStoreHttp, type StoreHttp } from '#services/integrations/stores/store_http'

export const SHOPIFY_API_VERSION = '2026-07'

/** Scopes the seller's app needs (shown on the connect form). */
export const SHOPIFY_SCOPES = [
  'write_products',
  // write: we cancel a shop order when no maker could print it (V6)
  'write_orders',
  'read_merchant_managed_fulfillment_orders',
  'write_merchant_managed_fulfillment_orders',
]

/** "my-shop", "my-shop.myshopify.com" or "https://my-shop.myshopify.com/admin" → "my-shop.myshopify.com" */
export function shopifyDomain(input: string): string | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
  const domain = text.includes('.') ? text : `${text}.myshopify.com`
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) ? domain : null
}

const gid = (type: string, id: string) =>
  id.startsWith('gid://') ? id : `gid://shopify/${type}/${id}`
const numericId = (id: string) => id.split('/').pop() ?? id

/**
 * Shopify through the seller's own app (docs: shopify.dev, Admin GraphQL). Since 2026 new custom
 * apps come from the Dev Dashboard: the seller gives the shop domain, client id and client
 * secret, and we mint the 24-hour token with the client-credentials grant. A legacy admin token
 * still works when given. Webhooks are signed with the app's client secret.
 */
export default class ShopifyAdapter implements StoreAdapter {
  readonly provider = 'shopify' as const
  readonly channel = 'shopify' as const
  private encryption = new EncryptionService()

  constructor(private http: StoreHttp = safeStoreHttp) {}

  async verify(connection: StoreConnection) {
    const data = await this.graphql<{ shop: { name: string; currencyCode: string } }>(
      connection,
      '{ shop { name currencyCode } }'
    )
    return { shopName: data.shop.name, currency: data.shop.currencyCode }
  }

  async ensureWebhooks(connection: StoreConnection, callbackUrl: string) {
    // paid orders are printed; a cancellation stops what has not started yet
    for (const topic of ['ORDERS_PAID', 'ORDERS_CANCELLED']) {
      await this.subscribe(connection, callbackUrl, topic)
    }
  }

  private async subscribe(connection: StoreConnection, callbackUrl: string, topic: string) {
    const data = await this.graphql<{
      webhookSubscriptionCreate: { userErrors: Array<{ message: string }> }
    }>(
      connection,
      `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription { id }
          userErrors { field message }
        }
      }`,
      { topic, webhookSubscription: { uri: callbackUrl, format: 'JSON' } }
    )
    const errors = data.webhookSubscriptionCreate.userErrors.filter(
      (e) => !/already been taken/i.test(e.message)
    )
    if (errors.length > 0) throw new StoreApiError(`Shopify: ${errors[0].message}`)
  }

  /** Every variant, following the cursor (250 per page, at most 40 pages). */
  async listVariants(connection: StoreConnection): Promise<StoreVariant[]> {
    const variants: StoreVariant[] = []
    let after: string | null = null
    for (let page = 0; page < 40; page++) {
      const data: {
        productVariants: {
          nodes: Array<{
            id: string
            sku: string | null
            displayName: string
            product: { id: string }
          }>
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } = await this.graphql(
        connection,
        `query variants($after: String) {
          productVariants(first: 250, after: $after) {
            nodes { id sku displayName product { id } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { after }
      )
      for (const v of data.productVariants.nodes) {
        variants.push({
          productId: numericId(v.product.id),
          variantId: numericId(v.id),
          sku: v.sku || null,
          title: v.displayName,
        })
      }
      if (!data.productVariants.pageInfo?.hasNextPage) break
      after = data.productVariants.pageInfo.endCursor
    }
    return variants
  }

  async publishProduct(
    connection: StoreConnection,
    input: PublishInput,
    existingProductId: string | null
  ): Promise<PublishResult> {
    const options = variantOptions(input.variants)
    const images = [
      ...new Set([...input.imageUrls, ...input.variants.flatMap((v) => v.imageUrl ?? [])]),
    ]
    const data = await this.graphql<{
      productSet: {
        product: { id: string; variants: { nodes: Array<{ id: string; sku: string }> } } | null
        userErrors: Array<{ message: string }>
      }
    }>(
      connection,
      `mutation productSet($input: ProductSetInput!, $synchronous: Boolean, $identifier: ProductSetIdentifiers) {
        productSet(input: $input, synchronous: $synchronous, identifier: $identifier) {
          product { id variants(first: 250) { nodes { id sku } } }
          userErrors { field message }
        }
      }`,
      {
        synchronous: true,
        ...(existingProductId ? { identifier: { id: gid('Product', existingProductId) } } : {}),
        input: {
          title: input.title,
          descriptionHtml: descriptionHtml(input.description),
          status: 'ACTIVE',
          productOptions: options.choices.map((o) => ({
            name: o.name,
            values: o.values.map((name) => ({ name })),
          })),
          variants: input.variants.map((v) => ({
            optionValues: options.valuesOf(v).map((o) => ({ optionName: o.name, name: o.value })),
            price: decimalPrice(v.priceMinor),
            sku: v.sku,
            // printed on demand: never "sold out"
            inventoryPolicy: 'CONTINUE',
            // the colour's picture; Shopify wants it in the product's files as well
            ...(v.imageUrl ? { file: imageFile(v.imageUrl, input.title) } : {}),
          })),
          ...(images.length > 0 ? { files: images.map((url) => imageFile(url, input.title)) } : {}),
        },
      }
    )
    const { product, userErrors } = data.productSet
    if (userErrors.length > 0 || !product) {
      throw new StoreApiError(`Shopify: ${userErrors[0]?.message ?? 'product was not saved'}`)
    }
    const ours = new Set(input.variants.map((v) => v.sku))
    return {
      productId: numericId(product.id),
      variants: product.variants.nodes
        .filter((v) => ours.has(v.sku))
        .map((v) => ({ variantId: numericId(v.id), sku: v.sku })),
    }
  }

  async unpublishProduct(connection: StoreConnection, productId: string) {
    const data = await this.graphql<{ productUpdate: { userErrors: Array<{ message: string }> } }>(
      connection,
      `mutation productUpdate($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id status }
          userErrors { field message }
        }
      }`,
      { product: { id: gid('Product', productId), status: 'DRAFT' } }
    )
    const errors = data.productUpdate.userErrors
    if (errors.length > 0) throw new StoreApiError(`Shopify: ${errors[0].message}`)
  }

  async parseOrderWebhook(
    connection: StoreConnection,
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<StoreEvent | null> {
    const secret = connection.apiSecretEnc ? this.encryption.decrypt(connection.apiSecretEnc) : ''
    const given = Buffer.from(headers['x-shopify-hmac-sha256'] ?? '', 'utf8')
    const expected = Buffer.from(
      createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64'),
      'utf8'
    )
    if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new StoreWebhookSignatureError()
    }
    const topic = headers['x-shopify-topic']
    const order = JSON.parse(rawBody) as ShopifyOrder
    if (topic === 'orders/cancelled')
      return { type: 'cancelled', externalOrderId: String(order.id) }
    if (topic !== 'orders/paid') return null

    const ship = order.shipping_address
    if (!ship) return null // nothing to ship (digital only)
    return {
      type: 'paid',
      order: {
        externalOrderId: String(order.id),
        name: order.name ?? null,
        lines: (order.line_items ?? [])
          .filter((l) => l.variant_id)
          .map((l) => ({
            variantId: String(l.variant_id),
            sku: l.sku || null,
            title: l.title ?? '',
            quantity: Number(l.quantity),
          })),
        shippingAddress: {
          fullName: ship.name ?? `${ship.first_name ?? ''} ${ship.last_name ?? ''}`.trim(),
          line1: ship.address1 ?? '',
          line2: ship.address2 ?? null,
          district: ship.province ?? null,
          city: ship.city ?? '',
          postalCode: ship.zip ?? '',
          country: (ship.country_code ?? '').toUpperCase(),
          phone: ship.phone ?? order.phone ?? null,
        },
      },
    }
  }

  /** Cancels the order and refunds its customer in Shopify (V6). */
  async cancelOrder(connection: StoreConnection, externalOrderId: string, reason: string) {
    const data = await this.graphql<{
      orderCancel: { orderCancelUserErrors: Array<{ message: string }> } | null
    }>(
      connection,
      `mutation orderCancel($orderId: ID!, $reason: OrderCancelReason!, $refund: Boolean!, $restock: Boolean!, $notifyCustomer: Boolean, $staffNote: String) {
        orderCancel(orderId: $orderId, reason: $reason, refund: $refund, restock: $restock, notifyCustomer: $notifyCustomer, staffNote: $staffNote) {
          job { id }
          orderCancelUserErrors { field message }
        }
      }`,
      {
        orderId: gid('Order', externalOrderId),
        reason: 'OTHER',
        refund: true,
        restock: false,
        notifyCustomer: true,
        staffNote: reason.slice(0, 250),
      }
    )
    const errors = data.orderCancel?.orderCancelUserErrors ?? []
    if (errors.length > 0) throw new StoreApiError(`Shopify: ${errors[0].message}`)
    return { refunded: true }
  }

  async pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ) {
    const data = await this.graphql<{
      order: { fulfillmentOrders: { nodes: Array<{ id: string; status: string }> } } | null
    }>(
      connection,
      `query order($id: ID!) { order(id: $id) { fulfillmentOrders(first: 10) { nodes { id status } } } }`,
      { id: gid('Order', externalOrderId) }
    )
    if (!data.order) throw new StoreApiError('Shopify: order not found')
    const open = data.order.fulfillmentOrders.nodes.filter((f) =>
      ['OPEN', 'IN_PROGRESS'].includes(f.status)
    )
    if (open.length === 0) return
    const result = await this.graphql<{
      fulfillmentCreate: { userErrors: Array<{ message: string }> }
    }>(
      connection,
      `mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
        fulfillmentCreate(fulfillment: $fulfillment) {
          fulfillment { id }
          userErrors { field message }
        }
      }`,
      {
        fulfillment: {
          lineItemsByFulfillmentOrder: open.map((f) => ({ fulfillmentOrderId: f.id })),
          notifyCustomer: true,
          trackingInfo: { company: shipment.carrier, number: shipment.trackingNumber },
        },
      }
    )
    const errors = result.fulfillmentCreate.userErrors
    if (errors.length > 0) throw new StoreApiError(`Shopify: ${errors[0].message}`)
  }

  private async graphql<T>(
    connection: StoreConnection,
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const token = await this.token(connection)
    const response = await this.http({
      method: 'POST',
      url: `https://${connection.shopUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-shopify-access-token': token,
      },
      body: JSON.stringify({ query, variables }),
    })
    if (response.status === 401 || response.status === 403) {
      throw new StoreApiError('Shopify refused the credentials or a permission is missing')
    }
    let json: { data?: T; errors?: Array<{ message: string }> | string }
    try {
      json = JSON.parse(response.body)
    } catch {
      throw new StoreApiError(`Shopify answered HTTP ${response.status}`)
    }
    if (json.errors) {
      const message = typeof json.errors === 'string' ? json.errors : json.errors[0]?.message
      throw new StoreApiError(`Shopify: ${message ?? 'request failed'}`)
    }
    if (!json.data) throw new StoreApiError(`Shopify answered HTTP ${response.status}`)
    return json.data
  }

  /** Legacy admin token as is; otherwise a client-credentials token, refreshed before expiry. */
  private async token(connection: StoreConnection): Promise<string> {
    const cached = connection.accessTokenEnc
      ? this.encryption.decrypt(connection.accessTokenEnc)
      : null
    const legacy = cached && !connection.tokenExpiresAt
    const fresh =
      connection.tokenExpiresAt && connection.tokenExpiresAt > DateTime.now().plus({ minutes: 5 })
    if (cached && (legacy || fresh)) return cached

    if (!connection.apiKeyEnc || !connection.apiSecretEnc) {
      throw new StoreApiError('Shopify credentials are missing')
    }
    const response = await this.http({
      method: 'POST',
      url: `https://${connection.shopUrl}/admin/oauth/access_token`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.encryption.decrypt(connection.apiKeyEnc),
        client_secret: this.encryption.decrypt(connection.apiSecretEnc),
      }).toString(),
    })
    let json: { access_token?: string; expires_in?: number }
    try {
      json = JSON.parse(response.body)
    } catch {
      json = {}
    }
    if (response.status !== 200 || !json.access_token) {
      throw new StoreApiError(
        'Shopify did not give an access token: check the client id and secret, and that the app is installed on this shop'
      )
    }
    connection.accessTokenEnc = this.encryption.encrypt(json.access_token)
    connection.tokenExpiresAt = DateTime.now().plus({ seconds: json.expires_in ?? 86_399 })
    if (connection.$isPersisted) await connection.save()
    return json.access_token
  }
}

interface ShopifyOrder {
  id: number | string
  name?: string
  phone?: string | null
  line_items?: Array<{ variant_id: number | null; sku?: string; title?: string; quantity: number }>
  shipping_address?: {
    name?: string
    first_name?: string
    last_name?: string
    address1?: string
    address2?: string | null
    city?: string
    province?: string | null
    zip?: string
    country_code?: string
    phone?: string | null
  } | null
}

function imageFile(url: string, alt: string) {
  return { originalSource: url, contentType: 'IMAGE', alt }
}
