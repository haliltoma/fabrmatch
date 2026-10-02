import { createHmac, createVerify, timingSafeEqual } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import type StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import {
  StoreApiError,
  StoreWebhookSignatureError,
  decimalPrice,
  variantOptions,
  type PublishInput,
  type PublishResult,
  type StoreAdapter,
  type StoreEvent,
  type StoreVariant,
} from '#services/integrations/stores/store_adapter'
import { safeStoreHttp, type StoreHttp } from '#services/integrations/stores/store_http'

export const WIX_API = 'https://www.wixapis.com'
/** The option our variants are made of, as in the other shops. */

export function wixConfigured() {
  return !!env.get('WIX_APP_ID') && !!env.get('WIX_APP_SECRET') && !!env.get('WIX_PUBLIC_KEY')
}

/** Where a seller adds our app to their Wix site (Wix's own installer page). */
export function wixInstallUrl() {
  return `https://www.wix.com/app-installer?appId=${encodeURIComponent(env.get('WIX_APP_ID') ?? '')}`
}

const base64url = (text: string) => Buffer.from(text, 'base64url')

/**
 * The signed `instance` parameter Wix adds when a site owner opens our app (or finishes the
 * install): `<signature>.<data>`, the signature an HMAC-SHA256 of the data part with our app
 * secret, both base64url. Null when it was not signed by Wix for our app.
 */
export function parseSignedInstance(
  param: string | undefined,
  appSecret: string
): { instanceId: string; signedAt: Date | null } | null {
  if (!param || !param.includes('.')) return null
  const [signature, data] = param.split('.', 2)
  const expected = createHmac('sha256', appSecret).update(data).digest()
  const given = base64url(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const parsed = JSON.parse(base64url(data).toString('utf8'))
    if (typeof parsed.instanceId !== 'string') return null
    const signedAt = typeof parsed.signDate === 'string' ? new Date(parsed.signDate) : null
    return {
      instanceId: parsed.instanceId,
      signedAt: signedAt && !Number.isNaN(signedAt.getTime()) ? signedAt : null,
    }
  } catch {
    return null
  }
}

/**
 * A Wix webhook: the body is a JWT signed (RS256) with the key on our app's Webhooks page. Its
 * `data` is a JSON string holding `instanceId`, `eventType` and the event itself (again a JSON
 * string in most events). Null when the signature or the shape is wrong.
 */
export function readWixWebhook(raw: string, publicKey: string) {
  const parts = raw.trim().split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  let alg: unknown
  try {
    alg = JSON.parse(base64url(header).toString('utf8')).alg
  } catch {
    return null
  }
  if (alg !== 'RS256') return null
  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${header}.${payload}`)
  if (!verifier.verify(publicKey, base64url(signature))) return null
  try {
    const claims = JSON.parse(base64url(payload).toString('utf8'))
    const outer = typeof claims.data === 'string' ? JSON.parse(claims.data) : claims.data
    const event = typeof outer?.data === 'string' ? JSON.parse(outer.data) : outer?.data
    if (typeof outer?.instanceId !== 'string') return null
    return {
      instanceId: outer.instanceId as string,
      eventType: String(outer.eventType ?? ''),
      event: (event ?? {}) as Record<string, any>,
    }
  } catch {
    return null
  }
}

/** The instance a webhook claims to be for, read before verifying (to find the shop only). */
export function wixWebhookInstanceId(raw: string): string | null {
  try {
    const claims = JSON.parse(base64url(raw.trim().split('.')[1] ?? '').toString('utf8'))
    const outer = typeof claims.data === 'string' ? JSON.parse(claims.data) : claims.data
    return typeof outer?.instanceId === 'string' ? outer.instanceId : null
  } catch {
    return null
  }
}

type WixVariant = {
  id?: string
  variantId?: string
  sku?: string
  visible?: boolean
  /** on a product's variants */
  choices?: Array<{ optionChoiceNames?: { optionName: string; choiceName: string } }>
  /** the same, as Query Variants names it */
  optionChoices?: Array<{ optionChoiceNames?: { optionName: string; choiceName: string } }>
  price?: { actualPrice?: { amount: string } }
  productData?: { productId: string; name: string }
}

/**
 * Wix Stores (Catalog V3) and eCommerce orders, as a Wix app (R4, Paket V V8). The seller adds
 * our app to their site; we act for that site with a token from our app id, secret and the site's
 * app instance (client credentials, 4 h). Webhooks are set up once in our app's dashboard and
 * reach `/webhooks/wix`. Field names from dev.wix.com (catalog v3, ecom orders, fulfillments).
 * Sites still on Catalog V1 are refused with a clear message: Wix moves every site to V3.
 */
export default class WixAdapter implements StoreAdapter {
  readonly provider = 'wix' as const
  readonly channel = 'wix' as const
  private encryption = new EncryptionService()

  constructor(private http: StoreHttp = safeStoreHttp) {}

  async verify(connection: StoreConnection) {
    const version = await this.call<{ catalogVersion?: string }>(
      connection,
      'GET',
      '/stores/v3/provision/version'
    )
    if (version.catalogVersion === 'STORES_NOT_INSTALLED') {
      throw new StoreApiError('Add Wix Stores to your site first, then connect it again')
    }
    if (version.catalogVersion !== 'V3_CATALOG') {
      throw new StoreApiError(
        'Your Wix store still uses the older catalog. Wix moves every store to the new one; connect again once yours has moved.'
      )
    }
    const site = await this.call<{
      properties?: { siteDisplayName?: string; businessName?: string; paymentCurrency?: string }
    }>(connection, 'GET', '/site-properties/v4/properties')
    return {
      shopName: site.properties?.siteDisplayName || site.properties?.businessName || 'Wix site',
      currency: site.properties?.paymentCurrency ?? null,
    }
  }

  /** Webhooks are declared in our app's dashboard, not per site. */
  async ensureWebhooks() {}

  async listVariants(connection: StoreConnection): Promise<StoreVariant[]> {
    const variants: StoreVariant[] = []
    let cursor: string | undefined
    do {
      const page = await this.call<{
        variants?: WixVariant[]
        pagingMetadata?: { cursors?: { next?: string }; hasNext?: boolean }
      }>(connection, 'POST', '/stores/v3/products/query-variants', {
        query: { cursorPaging: { limit: 1000, ...(cursor ? { cursor } : {}) } },
      })
      for (const v of page.variants ?? []) {
        const product = v.productData
        const variantId = v.variantId ?? v.id
        if (!product || !variantId) continue
        const choice = (v.optionChoices ?? v.choices ?? [])
          .map((c) => c.optionChoiceNames?.choiceName)
          .filter(Boolean)
          .join(' / ')
        variants.push({
          productId: product.productId,
          variantId,
          sku: v.sku ?? null,
          title: choice ? `${product.name} — ${choice}` : product.name,
        })
      }
      cursor = page.pagingMetadata?.hasNext ? page.pagingMetadata.cursors?.next : undefined
    } while (cursor)
    return variants
  }

  async publishProduct(
    connection: StoreConnection,
    input: PublishInput,
    existingProductId: string | null
  ): Promise<PublishResult> {
    const optionSet = variantOptions(input.variants)
    const images = [
      ...new Set([...input.imageUrls, ...input.variants.flatMap((v) => v.imageUrl ?? [])]),
    ]
    const variants = input.variants.map((v) => ({
      sku: v.sku,
      visible: true,
      choices: optionSet.valuesOf(v).map((o) => ({
        optionChoiceNames: {
          optionName: o.name,
          choiceName: o.value,
          renderType: 'TEXT_CHOICES',
        },
      })),
      price: { actualPrice: { amount: decimalPrice(v.priceMinor) } },
      physicalProperties: {},
    }))
    const options = optionSet.choices.map((o) => ({
      name: o.name,
      optionRenderType: 'TEXT_CHOICES',
      choicesSettings: {
        choices: o.values.map((name) => ({ choiceType: 'CHOICE_TEXT', name })),
      },
    }))

    if (existingProductId) {
      const current = await this.product(connection, existingProductId)
      const bySku = new Map(
        (current.variantsInfo?.variants ?? []).filter((v) => v.sku).map((v) => [v.sku!, v])
      )
      const sameVariants =
        bySku.size === input.variants.length && input.variants.every((v) => bySku.has(v.sku))
      if (sameVariants) {
        // the options stay; every variant keeps its id and gets its new price
        const updated = await this.call<{ product: WixProduct }>(
          connection,
          'PATCH',
          `/stores/v3/products/${existingProductId}`,
          {
            product: {
              id: existingProductId,
              revision: current.revision,
              name: input.title.slice(0, 80),
              plainDescription: input.description || undefined,
              visible: true,
              options: current.options,
              variantsInfo: {
                variants: variants.map((v) => ({ ...v, id: bySku.get(v.sku)!.id })),
              },
            },
          }
        )
        return this.result(updated.product ?? current, input)
      }
      // other variants than before: the old product leaves the shop, a new one replaces it
      await this.unpublishProduct(connection, existingProductId).catch(() => {})
    }

    const created = await this.call<{ product: WixProduct }>(
      connection,
      'POST',
      '/stores/v3/products',
      {
        product: {
          name: input.title.slice(0, 80),
          productType: 'PHYSICAL',
          plainDescription: input.description || undefined,
          visible: true,
          physicalProperties: {},
          ...(images.length > 0
            ? { media: { itemsInfo: { items: images.map((url) => ({ url })) } } }
            : {}),
          options,
          variantsInfo: { variants },
        },
      }
    )
    return this.result(created.product, input)
  }

  async unpublishProduct(connection: StoreConnection, productId: string) {
    const current = await this.product(connection, productId)
    await this.call(connection, 'PATCH', `/stores/v3/products/${productId}`, {
      product: { id: productId, revision: current.revision, visible: false },
    })
  }

  /** The signature is in the body (a JWT), so the headers say nothing. */
  async parseOrderWebhook(
    connection: StoreConnection,
    rawBody: string,
    _headers?: Record<string, string | undefined>
  ): Promise<StoreEvent | null> {
    const publicKey = env.get('WIX_PUBLIC_KEY')
    if (!publicKey) throw new StoreWebhookSignatureError()
    const webhook = readWixWebhook(rawBody, publicKey.replaceAll('\\n', '\n'))
    if (!webhook || webhook.instanceId !== connection.externalShopId) {
      throw new StoreWebhookSignatureError()
    }
    const event = webhook.event
    if (event.entityFqdn !== 'wix.ecom.v1.order') return null
    const order = event.actionEvent?.body?.order
    if (!order?.id) return null
    if (event.slug === 'canceled') return { type: 'cancelled', externalOrderId: String(order.id) }
    if (event.slug !== 'approved' || order.paymentStatus !== 'PAID') return null

    const destination = order.shippingInfo?.logistics?.shippingDestination ?? {}
    const address = destination.address ?? {}
    const contact = destination.contactDetails ?? {}
    const street = address.streetAddress
      ? `${address.streetAddress.name ?? ''} ${address.streetAddress.number ?? ''}`.trim()
      : ''
    return {
      type: 'paid',
      order: {
        externalOrderId: String(order.id),
        name: order.number ? `#${order.number}` : null,
        lines: (order.lineItems ?? []).map((line: any) => ({
          variantId: String(line.catalogReference?.options?.variantId ?? ''),
          sku: line.physicalProperties?.sku || null,
          title: String(line.productName?.original ?? ''),
          quantity: Number(line.quantity ?? 0),
        })),
        shippingAddress: {
          fullName: `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim(),
          line1: address.addressLine || street,
          line2: address.addressLine2 ?? null,
          city: address.city ?? '',
          district: address.subdivision ?? null,
          postalCode: address.postalCode ?? '',
          country: address.country ?? '',
          phone: contact.phone ?? null,
        },
      },
    }
  }

  async pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ) {
    const { order } = await this.call<{
      order: { lineItems?: Array<{ id: string; quantity?: number }>; fulfillmentStatus?: string }
    }>(connection, 'GET', `/ecom/v1/orders/${externalOrderId}`)
    if (order.fulfillmentStatus === 'FULFILLED') return
    const response = await this.request(
      connection,
      'POST',
      `/ecom/v1/fulfillments/orders/${externalOrderId}/create-fulfillment`,
      {
        fulfillment: {
          lineItems: (order.lineItems ?? []).map((l) => ({ id: l.id, quantity: l.quantity })),
          trackingInfo: {
            trackingNumber: shipment.trackingNumber,
            shippingProvider: shipment.carrier,
          },
        },
      }
    )
    // the same tracking pushed twice: already done
    if (response.status === 409 && response.body.includes('TRACKING_NUMBER_ALREADY_EXISTS')) return
    if (response.status < 200 || response.status >= 300) {
      throw new StoreApiError(`Wix: fulfillment failed (${response.status})`)
    }
  }

  /** Cancels the order in the shop; Wix does not refund on cancel, so the seller does. */
  async cancelOrder(connection: StoreConnection, externalOrderId: string, reason: string) {
    await this.call(connection, 'POST', `/ecom/v1/orders/${externalOrderId}/cancel`, {
      sendOrderCanceledEmail: true,
      customMessage: reason.slice(0, 1000),
      restockAllItems: false,
    })
    return { refunded: false }
  }

  private async product(connection: StoreConnection, productId: string) {
    const { product } = await this.call<{ product: WixProduct }>(
      connection,
      'GET',
      `/stores/v3/products/${productId}?fields=VARIANT_OPTION_CHOICE_NAMES`
    )
    return product
  }

  private result(product: WixProduct, input: PublishInput): PublishResult {
    const ours = new Set(input.variants.map((v) => v.sku))
    return {
      productId: product.id,
      variants: (product.variantsInfo?.variants ?? [])
        .filter((v) => v.sku && ours.has(v.sku))
        .map((v) => ({ variantId: v.id!, sku: v.sku! })),
    }
  }

  /** Client credentials for this site's app instance; cached on the connection for 4 h. */
  private async token(connection: StoreConnection): Promise<string> {
    const cached = connection.accessTokenEnc
      ? this.encryption.decrypt(connection.accessTokenEnc)
      : null
    if (
      cached &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt > DateTime.now().plus({ minutes: 5 })
    ) {
      return cached
    }
    const appId = env.get('WIX_APP_ID')
    const secret = env.get('WIX_APP_SECRET')?.release()
    if (!appId || !secret) throw new StoreApiError('Wix is not set up on Fabrmatch yet')
    const response = await this.http({
      method: 'POST',
      url: `${WIX_API}/oauth2/token`,
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: appId,
        client_secret: secret,
        instance_id: connection.externalShopId,
      }),
    })
    let json: { access_token?: string; expires_in?: number } = {}
    try {
      json = JSON.parse(response.body)
    } catch {}
    if (response.status !== 200 || !json.access_token) {
      throw new StoreApiError('Wix did not give an access token: is our app still on your site?')
    }
    connection.accessTokenEnc = this.encryption.encrypt(json.access_token)
    connection.tokenExpiresAt = DateTime.now().plus({ seconds: json.expires_in ?? 14_400 })
    if (connection.$isPersisted) await connection.save()
    return json.access_token
  }

  private async request(
    connection: StoreConnection,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown
  ) {
    return this.http({
      method,
      url: `${WIX_API}${path}`,
      headers: {
        'authorization': await this.token(connection),
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  private async call<T = unknown>(
    connection: StoreConnection,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await this.request(connection, method, path, body)
    if (response.status < 200 || response.status >= 300) {
      let message = ''
      try {
        message = JSON.parse(response.body).message ?? ''
      } catch {}
      throw new StoreApiError(`Wix: ${message || `request failed (${response.status})`}`)
    }
    return (response.body ? JSON.parse(response.body) : {}) as T
  }
}

type WixProduct = {
  id: string
  revision?: string
  options?: unknown[]
  variantsInfo?: { variants?: WixVariant[] }
}
