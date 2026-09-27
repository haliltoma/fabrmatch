import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import {
  StoreApiError,
  StoreWebhookSignatureError,
  decimalPrice,
  type StoreEvent,
  type PublishInput,
  type PublishResult,
  type StoreAdapter,
  type StoreVariant,
} from '#services/integrations/stores/store_adapter'
import { safeStoreHttp, type StoreHttp } from '#services/integrations/stores/store_http'
import { validateWebhookUrl } from '#services/integrations/webhook_url'

/** Orders in these states are paid and ready to print. */
const PAID_STATUSES = ['processing', 'completed']
/** The shop gave the money back or called the order off. */
const CANCELLED_STATUSES = ['cancelled', 'refunded']

/** Seller's site URL → normalised https origin + path (no trailing slash), or null. */
export function wooSiteUrl(input: string): string | null {
  try {
    const url = validateWebhookUrl(input.includes('://') ? input : `https://${input}`, {
      allowHttp: false,
    })
    return url.replace(/\/+$/, '').replace(/\/wp-json.*$/, '')
  } catch {
    return null
  }
}

/**
 * WooCommerce REST API v3 (docs: woocommerce.github.io/woocommerce-rest-api-docs) with the
 * seller's consumer key/secret over HTTPS basic auth. Webhooks carry X-WC-Webhook-Signature =
 * base64 HMAC-SHA256 of the body with the secret we set when creating them.
 */
export default class WooCommerceAdapter implements StoreAdapter {
  readonly provider = 'woocommerce' as const
  readonly channel = 'woocommerce' as const
  private encryption = new EncryptionService()

  constructor(private http: StoreHttp = safeStoreHttp) {}

  async verify(connection: StoreConnection) {
    await this.call(connection, 'GET', '/products?per_page=1')
    const settings = await this.call<Array<{ id: string; value: string }>>(
      connection,
      'GET',
      '/settings/general'
    )
    const currency = settings.find((s) => s.id === 'woocommerce_currency')?.value ?? null
    return { shopName: new URL(connection.shopUrl!).hostname, currency }
  }

  async ensureWebhooks(connection: StoreConnection, callbackUrl: string) {
    const existing = await this.call<Array<{ topic: string; delivery_url: string }>>(
      connection,
      'GET',
      '/webhooks?per_page=100'
    )
    if (!connection.webhookSecretEnc) {
      connection.webhookSecretEnc = this.encryption.encrypt(randomBytes(24).toString('hex'))
      if (connection.$isPersisted) await connection.save()
    }
    const secret = this.encryption.decrypt(connection.webhookSecretEnc)
    // a paid order can arrive as a new order or as an update of a pending one
    for (const topic of ['order.created', 'order.updated']) {
      if (existing.some((w) => w.topic === topic && w.delivery_url === callbackUrl)) continue
      await this.call(connection, 'POST', '/webhooks', {
        name: `Fabrmatch ${topic}`,
        topic,
        delivery_url: callbackUrl,
        secret,
        status: 'active',
      })
    }
  }

  async listVariants(connection: StoreConnection): Promise<StoreVariant[]> {
    // 100 per page (the API maximum), at most 50 pages
    const products: Array<{
      id: number
      name: string
      sku: string
      type: string
      variations: number[]
    }> = []
    for (let page = 1; page <= 50; page++) {
      const batch = await this.call<typeof products>(
        connection,
        'GET',
        `/products?per_page=100&page=${page}`
      )
      products.push(...batch)
      if (batch.length < 100) break
    }
    const variants: StoreVariant[] = []
    for (const product of products) {
      if (product.type === 'variable' && product.variations.length > 0) {
        const children = await this.call<
          Array<{ id: number; sku: string; attributes: Array<{ option: string }> }>
        >(connection, 'GET', `/products/${product.id}/variations?per_page=100`)
        for (const child of children) {
          variants.push({
            productId: String(product.id),
            variantId: String(child.id),
            sku: child.sku || null,
            title: [product.name, ...child.attributes.map((a) => a.option)].join(' — '),
          })
        }
      } else {
        variants.push({
          productId: String(product.id),
          variantId: String(product.id),
          sku: product.sku || null,
          title: product.name,
        })
      }
    }
    return variants
  }

  async publishProduct(
    connection: StoreConnection,
    input: PublishInput,
    existingProductId: string | null
  ): Promise<PublishResult> {
    const body = {
      name: input.title,
      type: 'variable',
      status: 'publish',
      description: input.description,
      images: input.imageUrls.map((src) => ({ src })),
      attributes: [
        {
          name: 'Material',
          variation: true,
          visible: true,
          options: input.variants.map((v) => v.material),
        },
      ],
    }
    const product = existingProductId
      ? await this.call<{ id: number }>(connection, 'PUT', `/products/${existingProductId}`, body)
      : await this.call<{ id: number }>(connection, 'POST', '/products', body)

    const current = existingProductId
      ? await this.call<Array<{ id: number; sku: string }>>(
          connection,
          'GET',
          `/products/${product.id}/variations?per_page=100`
        )
      : []
    const bySku = new Map(current.map((v) => [v.sku, v.id]))
    const payload = (v: PublishInput['variants'][number]) => ({
      regular_price: decimalPrice(v.priceMinor),
      sku: v.sku,
      manage_stock: false,
      stock_status: 'instock',
      attributes: [{ name: 'Material', option: v.material }],
    })
    const batch = await this.call<{
      create?: Array<{ id: number; sku: string; error?: { message: string } }>
      update?: Array<{ id: number; sku: string; error?: { message: string } }>
    }>(connection, 'POST', `/products/${product.id}/variations/batch`, {
      create: input.variants.filter((v) => !bySku.has(v.sku)).map(payload),
      update: input.variants
        .filter((v) => bySku.has(v.sku))
        .map((v) => ({ id: bySku.get(v.sku), ...payload(v) })),
    })
    const saved = [...(batch.create ?? []), ...(batch.update ?? [])]
    const failed = saved.find((v) => v.error)
    if (failed) throw new StoreApiError(`WooCommerce: ${failed.error!.message}`)
    const material = new Map(input.variants.map((v) => [v.sku, v.material]))
    return {
      productId: String(product.id),
      variants: saved
        .filter((v) => material.has(v.sku))
        .map((v) => ({ variantId: String(v.id), sku: v.sku, material: material.get(v.sku)! })),
    }
  }

  async unpublishProduct(connection: StoreConnection, productId: string) {
    await this.call(connection, 'PUT', `/products/${productId}`, { status: 'draft' })
  }

  async parseOrderWebhook(
    connection: StoreConnection,
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<StoreEvent | null> {
    const secret = connection.webhookSecretEnc
      ? this.encryption.decrypt(connection.webhookSecretEnc)
      : ''
    const given = Buffer.from(headers['x-wc-webhook-signature'] ?? '', 'utf8')
    const expected = Buffer.from(
      createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64'),
      'utf8'
    )
    // WooCommerce pings a new webhook with a form body ("webhook_id=12"), unsigned
    if (/^webhook_id=\d+$/.test(rawBody.trim())) return null
    if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new StoreWebhookSignatureError()
    }
    const order = JSON.parse(rawBody) as WooOrder
    if (CANCELLED_STATUSES.includes(order.status)) {
      return { type: 'cancelled', externalOrderId: String(order.id) }
    }
    if (!PAID_STATUSES.includes(order.status)) return null
    const ship = order.shipping?.address_1 ? order.shipping : order.billing
    if (!ship?.address_1) return null
    return {
      type: 'paid',
      order: {
        externalOrderId: String(order.id),
        name: order.number ? `#${order.number}` : null,
        lines: (order.line_items ?? []).map((l) => ({
          variantId: String(l.variation_id || l.product_id),
          sku: l.sku || null,
          title: l.name ?? '',
          quantity: Number(l.quantity),
        })),
        shippingAddress: {
          fullName: `${ship.first_name ?? ''} ${ship.last_name ?? ''}`.trim(),
          line1: ship.address_1,
          line2: ship.address_2 || null,
          district: ship.state || null,
          city: ship.city ?? '',
          postalCode: ship.postcode ?? '',
          country: (ship.country ?? '').toUpperCase(),
          phone: ship.phone || order.billing?.phone || null,
        },
      },
    }
  }

  /** Customer-visible note with the tracking, then "completed"; skipped if already completed. */
  async pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ) {
    const order = await this.call<{ status: string }>(
      connection,
      'GET',
      `/orders/${externalOrderId}`
    )
    if (order.status === 'completed') return
    await this.call(connection, 'POST', `/orders/${externalOrderId}/notes`, {
      note: `Shipped with ${shipment.carrier}. Tracking number: ${shipment.trackingNumber}`,
      customer_note: true,
    })
    await this.call(connection, 'PUT', `/orders/${externalOrderId}`, { status: 'completed' })
  }

  private async call<T = unknown>(
    connection: StoreConnection,
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!connection.shopUrl || !connection.apiKeyEnc || !connection.apiSecretEnc) {
      throw new StoreApiError('WooCommerce credentials are missing')
    }
    const auth = Buffer.from(
      `${this.encryption.decrypt(connection.apiKeyEnc)}:${this.encryption.decrypt(connection.apiSecretEnc)}`
    ).toString('base64')
    const response = await this.http({
      method,
      url: `${connection.shopUrl}/wp-json/wc/v3${path}`,
      headers: {
        authorization: `Basic ${auth}`,
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status === 401 || response.status === 403) {
      throw new StoreApiError('WooCommerce refused the key: it needs Read/Write permission')
    }
    let json: unknown
    try {
      json = JSON.parse(response.body)
    } catch {
      throw new StoreApiError(`WooCommerce answered HTTP ${response.status} (is the REST API on?)`)
    }
    if (response.status >= 400) {
      const message = (json as { message?: string }).message ?? `HTTP ${response.status}`
      throw new StoreApiError(`WooCommerce: ${message}`)
    }
    return json as T
  }
}

interface WooAddress {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  phone?: string
}

interface WooOrder {
  id: number
  number?: string
  status: string
  line_items?: Array<{
    product_id: number
    variation_id: number
    sku?: string
    name?: string
    quantity: number
  }>
  shipping?: WooAddress
  billing?: WooAddress
}
