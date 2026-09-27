import { DateTime } from 'luxon'
import env from '#start/env'
import type StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import {
  StoreApiError,
  StoreWebhookSignatureError,
  decimalPrice,
  type PublishInput,
  type PublishResult,
  type StoreAdapter,
  type StoreEvent,
  type StoreVariant,
} from '#services/integrations/stores/store_adapter'
import { safeStoreHttp, type StoreHttp } from '#services/integrations/stores/store_http'

export const ETSY_API = 'https://api.etsy.com'
export const ETSY_SCOPES = [
  'shops_r',
  'listings_r',
  'listings_w',
  'transactions_r',
  'transactions_w',
]
/** Etsy's custom variation property ("Material" in our listings). */
const CUSTOM_PROPERTY_ID = 513
/** Made to order: the offering quantity is only a ceiling Etsy needs. */
const OFFERING_QUANTITY = 999

export function etsyConfigured() {
  return !!env.get('ETSY_KEYSTRING') && !!env.get('ETSY_SHARED_SECRET')
}

function apiKey() {
  const keystring = env.get('ETSY_KEYSTRING')
  const secret = env.get('ETSY_SHARED_SECRET')?.release()
  if (!keystring || !secret) throw new StoreApiError('Etsy is not set up on Fabrmatch yet')
  // Open API v3: "keystring:shared_secret"
  return `${keystring}:${secret}`
}

const form = (values: Record<string, string | number | boolean | string[] | undefined>) => {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => body.append(key, v))
    else body.append(key, String(value))
  }
  return body.toString()
}

/**
 * Etsy Open API v3 (field names from Etsy's published OpenAPI document). Connected with OAuth2
 * PKCE through our registered app (the seller cannot use a key alone); access tokens last an hour
 * and are refreshed with the 90-day refresh token. Etsy sends no order webhooks: paid receipts are
 * polled (`pollOrders`).
 */
export default class EtsyAdapter implements StoreAdapter {
  readonly provider = 'etsy' as const
  readonly channel = 'etsy' as const
  private encryption = new EncryptionService()

  constructor(private http: StoreHttp = safeStoreHttp) {}

  /** The HTTP exchange this adapter talks through (the OAuth flow uses the same one). */
  get transport(): StoreHttp {
    return this.http
  }

  async verify(connection: StoreConnection) {
    const shop = await this.call<{ shop_name: string; currency_code: string }>(
      connection,
      'GET',
      `/v3/application/shops/${connection.externalShopId}`
    )
    return { shopName: shop.shop_name, currency: shop.currency_code ?? null }
  }

  /** Who connected: their Etsy user id and shop id (getMe). */
  async me(connection: StoreConnection) {
    return this.call<{ user_id: number; shop_id: number }>(
      connection,
      'GET',
      '/v3/application/users/me'
    )
  }

  /** Every seller category (getSellerTaxonomyNodes), flattened with its full path. */
  async categories(): Promise<Array<{ id: number; path: string }>> {
    const response = await this.http({
      method: 'GET',
      url: `${ETSY_API}/v3/application/seller-taxonomy/nodes`,
      headers: { 'x-api-key': apiKey(), 'accept': 'application/json' },
    })
    if (response.status !== 200)
      throw new StoreApiError('Etsy categories are not available right now')
    type Node = { id: number; name: string; children?: Node[] }
    const flat: Array<{ id: number; path: string }> = []
    const walk = (nodes: Node[], prefix: string) => {
      for (const node of nodes) {
        const path = prefix ? `${prefix} › ${node.name}` : node.name
        if (!node.children || node.children.length === 0) flat.push({ id: node.id, path })
        walk(node.children ?? [], path)
      }
    }
    walk((JSON.parse(response.body) as { results: Node[] }).results ?? [], '')
    return flat
  }

  /** Etsy has no order webhooks; orders are polled instead. */
  async ensureWebhooks() {}

  /** Variants of every listing we could sell again (active, inactive, draft), 100 per page. */
  async listVariants(connection: StoreConnection): Promise<StoreVariant[]> {
    const variants: StoreVariant[] = []
    for (const state of ['active', 'inactive', 'draft']) {
      for (let offset = 0; offset < 5000; offset += 100) {
        const page = await this.call<{ results: Array<{ listing_id: number; title: string }> }>(
          connection,
          'GET',
          `/v3/application/shops/${connection.externalShopId}/listings?state=${state}&limit=100&offset=${offset}`
        )
        for (const listing of page.results) {
          const inventory = await this.call<{
            products: Array<{
              product_id: number
              sku: string
              is_deleted: boolean
              property_values: Array<{ values: string[] }>
            }>
          }>(connection, 'GET', `/v3/application/listings/${listing.listing_id}/inventory`)
          for (const product of inventory.products.filter((p) => !p.is_deleted)) {
            variants.push({
              productId: String(listing.listing_id),
              variantId: String(product.product_id),
              sku: product.sku || null,
              title: [listing.title, ...product.property_values.flatMap((v) => v.values)].join(
                ' — '
              ),
            })
          }
        }
        if (page.results.length < 100) break
      }
    }
    return variants
  }

  /**
   * Draft listing → inventory (one product per material) → images → active. Etsy needs a
   * category (taxonomy), a shipping profile and a processing profile; the shop's first profiles
   * are used. Without an image the listing stays a draft in the shop.
   */
  async publishProduct(
    connection: StoreConnection,
    input: PublishInput,
    existingProductId: string | null
  ): Promise<PublishResult> {
    const shopPath = `/v3/application/shops/${connection.externalShopId}`
    const readiness = await this.firstId<{ readiness_state_id: number }>(
      connection,
      `${shopPath}/readiness-state-definitions`,
      'readiness_state_id',
      'Create a processing profile in your Etsy shop first'
    )
    const cheapest = Math.min(...input.variants.map((v) => v.priceMinor))
    let listingId = existingProductId
    if (!listingId) {
      if (!input.categoryId) throw new StoreApiError('Choose an Etsy category for this product')
      const shipping = await this.firstId<{ shipping_profile_id: number }>(
        connection,
        `${shopPath}/shipping-profiles`,
        'shipping_profile_id',
        'Create a shipping profile in your Etsy shop first'
      )
      const created = await this.call<{ listing_id: number }>(
        connection,
        'POST',
        `${shopPath}/listings`,
        form({
          quantity: OFFERING_QUANTITY,
          title: input.title.slice(0, 140),
          description: input.description || input.title,
          price: decimalPrice(cheapest),
          who_made: 'i_did',
          when_made: 'made_to_order',
          taxonomy_id: input.categoryId,
          shipping_profile_id: shipping,
          readiness_state_id: readiness,
          type: 'physical',
          is_supply: false,
        }),
        'application/x-www-form-urlencoded'
      )
      listingId = String(created.listing_id)
    } else {
      await this.call(
        connection,
        'PATCH',
        `${shopPath}/listings/${listingId}`,
        form({ title: input.title.slice(0, 140), description: input.description || input.title }),
        'application/x-www-form-urlencoded'
      )
    }

    const inventory = await this.call<{
      products: Array<{
        product_id: number
        sku: string
        property_values: Array<{ values: string[] }>
      }>
    }>(
      connection,
      'PUT',
      `/v3/application/listings/${listingId}/inventory`,
      JSON.stringify({
        products: input.variants.map((v) => ({
          sku: v.sku,
          property_values: [
            {
              property_id: CUSTOM_PROPERTY_ID,
              property_name: 'Material',
              value_ids: [],
              values: [v.material],
            },
          ],
          offerings: [
            {
              // the API takes a JSON number; built from the exact decimal string
              price: Number(decimalPrice(v.priceMinor)),
              quantity: OFFERING_QUANTITY,
              is_enabled: true,
              readiness_state_id: readiness,
            },
          ],
        })),
        price_on_property: [CUSTOM_PROPERTY_ID],
        sku_on_property: [CUSTOM_PROPERTY_ID],
      }),
      'application/json'
    )

    for (const [rank, image] of (input.images ?? []).slice(0, 10).entries()) {
      await this.upload(connection, `${shopPath}/listings/${listingId}/images`, image, rank + 1)
    }
    if ((input.images ?? []).length > 0 || existingProductId) {
      await this.call(
        connection,
        'PATCH',
        `${shopPath}/listings/${listingId}`,
        form({ state: 'active' }),
        'application/x-www-form-urlencoded'
      )
    }

    const material = new Map(input.variants.map((v) => [v.sku, v.material]))
    return {
      productId: listingId,
      variants: inventory.products
        .filter((p) => material.has(p.sku))
        .map((p) => ({
          variantId: String(p.product_id),
          sku: p.sku,
          material: material.get(p.sku)!,
        })),
    }
  }

  async unpublishProduct(connection: StoreConnection, productId: string) {
    await this.call(
      connection,
      'PATCH',
      `/v3/application/shops/${connection.externalShopId}/listings/${productId}`,
      form({ state: 'inactive' }),
      'application/x-www-form-urlencoded'
    )
  }

  /** Etsy sends nothing to us; a delivery on our endpoint is never genuine. */
  async parseOrderWebhook(): Promise<StoreEvent | null> {
    throw new StoreWebhookSignatureError()
  }

  /** Paid receipts changed since `since` (and cancellations), oldest first. */
  async pollOrders(connection: StoreConnection, since: DateTime): Promise<StoreEvent[]> {
    const events: StoreEvent[] = []
    for (let offset = 0; offset < 2000; offset += 100) {
      const page = await this.call<{ results: EtsyReceipt[] }>(
        connection,
        'GET',
        `/v3/application/shops/${connection.externalShopId}/receipts?min_last_modified=${Math.floor(since.toSeconds())}&sort_on=updated&sort_order=asc&limit=100&offset=${offset}`
      )
      for (const receipt of page.results) {
        const status = receipt.status.toLowerCase()
        if (status === 'canceled' || status === 'fully refunded') {
          events.push({ type: 'cancelled', externalOrderId: String(receipt.receipt_id) })
          continue
        }
        if (!receipt.is_paid || receipt.is_shipped) continue
        events.push({
          type: 'paid',
          order: {
            externalOrderId: String(receipt.receipt_id),
            name: `#${receipt.receipt_id}`,
            lines: receipt.transactions.map((t) => ({
              variantId: String(t.product_id),
              sku: t.sku || null,
              title: t.title,
              quantity: t.quantity,
            })),
            shippingAddress: {
              fullName: receipt.name,
              line1: receipt.first_line ?? '',
              line2: receipt.second_line ?? null,
              district: receipt.state ?? null,
              city: receipt.city ?? '',
              postalCode: receipt.zip ?? '',
              country: (receipt.country_iso ?? '').toUpperCase(),
              phone: null,
            },
          },
        })
      }
      if (page.results.length < 100) break
    }
    return events
  }

  /** Tracking on the receipt; skipped when Etsy already shows it shipped. */
  async pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ) {
    const shopPath = `/v3/application/shops/${connection.externalShopId}`
    const receipt = await this.call<{ is_shipped: boolean }>(
      connection,
      'GET',
      `${shopPath}/receipts/${externalOrderId}`
    )
    if (receipt.is_shipped) return
    await this.call(
      connection,
      'POST',
      `${shopPath}/receipts/${externalOrderId}/tracking`,
      JSON.stringify({ tracking_code: shipment.trackingNumber, carrier_name: shipment.carrier }),
      'application/json'
    )
  }

  private async firstId<T>(
    connection: StoreConnection,
    path: string,
    field: keyof T,
    missing: string
  ): Promise<number> {
    const data = await this.call<T[] | { results: T[] }>(connection, 'GET', path)
    const rows = Array.isArray(data) ? data : data.results
    const id = rows[0]?.[field]
    if (!id) throw new StoreApiError(missing)
    return Number(id)
  }

  private async upload(
    connection: StoreConnection,
    path: string,
    image: { bytes: Buffer; contentType: string },
    rank: number
  ) {
    const boundary = `----fabrmatch${Date.now().toString(16)}`
    const ext = image.contentType === 'image/png' ? 'png' : 'jpg'
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="rank"\r\n\r\n${rank}\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="image-${rank}.${ext}"\r\nContent-Type: ${image.contentType}\r\n\r\n`
      ),
      image.bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    await this.call(connection, 'POST', path, body, `multipart/form-data; boundary=${boundary}`)
  }

  private async call<T = unknown>(
    connection: StoreConnection,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    path: string,
    body?: string | Buffer,
    contentType?: string
  ): Promise<T> {
    const token = await this.token(connection)
    const response = await this.http({
      method,
      url: `${ETSY_API}${path}`,
      headers: {
        'x-api-key': apiKey(),
        'authorization': `Bearer ${token}`,
        'accept': 'application/json',
        ...(contentType ? { 'content-type': contentType } : {}),
      },
      body,
    })
    if (response.status === 401 || response.status === 403) {
      throw new StoreApiError('Etsy refused the connection: connect the shop again')
    }
    let json: unknown = null
    try {
      json = response.body ? JSON.parse(response.body) : null
    } catch {
      throw new StoreApiError(`Etsy answered HTTP ${response.status}`)
    }
    if (response.status >= 400) {
      throw new StoreApiError(
        `Etsy: ${(json as { error?: string })?.error ?? `HTTP ${response.status}`}`
      )
    }
    return json as T
  }

  /** Refreshes the one-hour access token with the refresh token when it is about to expire. */
  private async token(connection: StoreConnection): Promise<string> {
    const cached = connection.accessTokenEnc
      ? this.encryption.decrypt(connection.accessTokenEnc)
      : null
    if (
      cached &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt > DateTime.now().plus({ minutes: 2 })
    ) {
      return cached
    }
    if (!connection.refreshTokenEnc)
      throw new StoreApiError('Etsy refused the connection: connect the shop again')
    const tokens = await exchangeToken(this.http, {
      grant_type: 'refresh_token',
      client_id: env.get('ETSY_KEYSTRING') ?? '',
      refresh_token: this.encryption.decrypt(connection.refreshTokenEnc),
    })
    connection.accessTokenEnc = this.encryption.encrypt(tokens.access_token)
    connection.refreshTokenEnc = this.encryption.encrypt(tokens.refresh_token)
    connection.tokenExpiresAt = DateTime.now().plus({ seconds: tokens.expires_in })
    if (connection.$isPersisted) await connection.save()
    return tokens.access_token
  }
}

/** POST /v3/public/oauth/token (authorization_code or refresh_token grant). */
export async function exchangeToken(
  http: StoreHttp,
  params: Record<string, string>
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await http({
    method: 'POST',
    url: `${ETSY_API}/v3/public/oauth/token`,
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
    body: new URLSearchParams(params).toString(),
  })
  let json: { access_token?: string; refresh_token?: string; expires_in?: number } = {}
  try {
    json = JSON.parse(response.body)
  } catch {}
  if (response.status !== 200 || !json.access_token || !json.refresh_token) {
    throw new StoreApiError('Etsy did not accept the connection: try connecting again')
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in ?? 3600,
  }
}

interface EtsyReceipt {
  receipt_id: number
  status: string
  is_paid: boolean
  is_shipped: boolean
  name: string
  first_line?: string
  second_line?: string | null
  city?: string
  state?: string | null
  zip?: string
  country_iso?: string
  transactions: Array<{ product_id: number; sku: string; title: string; quantity: number }>
}
