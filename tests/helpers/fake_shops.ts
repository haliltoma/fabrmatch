import { createHmac } from 'node:crypto'
import StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import type { StoreHttp, StoreHttpRequest } from '#services/integrations/stores/store_http'
import { SHOPIFY_API_VERSION } from '#services/integrations/stores/shopify_adapter'

const json = (status: number, body: unknown) => ({ status, body: JSON.stringify(body) })

/**
 * In-memory Shopify Admin API: the client-credentials token endpoint and the GraphQL
 * operations the adapter uses, answering in the documented shapes.
 */
export class FakeShopify {
  domain = 'test-shop.myshopify.com'
  clientId = 'client-id-123'
  clientSecret = 'client-secret-456'
  tokens: string[] = []
  requests: Array<{
    url: string
    query?: string
    variables?: any
    headers: Record<string, string>
  }> = []
  webhooks: Array<{ topic: string; uri: string }> = []
  products = new Map<
    string,
    { title: string; variants: Array<{ id: string; sku: string; price: string }> }
  >()
  fulfillmentOrders = new Map<string, Array<{ id: string; status: string }>>()
  fulfillments: Array<{ orderId: string; number: string; company: string }> = []
  private seq = 1000

  http: StoreHttp = async (req: StoreHttpRequest) => {
    const url = new URL(req.url)
    if (url.host !== this.domain) return json(404, { errors: 'Not Found' })

    if (url.pathname === '/admin/oauth/access_token') {
      const form = new URLSearchParams(req.body ?? '')
      this.requests.push({ url: req.url, headers: req.headers })
      if (
        form.get('grant_type') !== 'client_credentials' ||
        form.get('client_id') !== this.clientId ||
        form.get('client_secret') !== this.clientSecret
      ) {
        return json(400, { error: 'invalid_client' })
      }
      const token = `shpat_${++this.seq}`
      this.tokens.push(token)
      return json(200, { access_token: token, scope: 'write_products', expires_in: 86399 })
    }

    if (url.pathname !== `/admin/api/${SHOPIFY_API_VERSION}/graphql.json`) {
      return json(404, { errors: 'Not Found' })
    }
    const token = req.headers['x-shopify-access-token']
    if (!token || !this.tokens.includes(token)) {
      return json(401, { errors: '[API] Invalid API key or access token' })
    }
    const { query, variables } = JSON.parse(req.body ?? '{}')
    this.requests.push({ url: req.url, query, variables, headers: req.headers })

    if (query.includes('shop {')) {
      return json(200, { data: { shop: { name: 'Test Shop', currencyCode: 'TRY' } } })
    }
    if (query.includes('webhookSubscriptionCreate')) {
      const taken = this.webhooks.some(
        (w) => w.topic === variables.topic && w.uri === variables.webhookSubscription.uri
      )
      if (!taken)
        this.webhooks.push({ topic: variables.topic, uri: variables.webhookSubscription.uri })
      return json(200, {
        data: {
          webhookSubscriptionCreate: {
            webhookSubscription: taken
              ? null
              : { id: `gid://shopify/WebhookSubscription/${++this.seq}` },
            userErrors: taken
              ? [{ field: ['address'], message: 'Address for this topic has already been taken' }]
              : [],
          },
        },
      })
    }
    if (query.includes('productVariants(')) {
      const nodes = [...this.products.entries()].flatMap(([pid, p]) =>
        p.variants.map((v) => ({
          id: `gid://shopify/ProductVariant/${v.id}`,
          sku: v.sku,
          displayName: `${p.title} - ${v.sku}`,
          product: { id: `gid://shopify/Product/${pid}` },
        }))
      )
      return json(200, { data: { productVariants: { nodes } } })
    }
    if (query.includes('productSet(')) {
      const input = variables.input
      const existing = variables.identifier?.id?.split('/').pop() as string | undefined
      const id = existing ?? String(++this.seq)
      const before = this.products.get(id)?.variants ?? []
      const variants = input.variants.map((v: any) => ({
        id: before.find((b) => b.sku === v.sku)?.id ?? String(++this.seq),
        sku: v.sku,
        price: v.price,
      }))
      this.products.set(id, { title: input.title, variants })
      return json(200, {
        data: {
          productSet: {
            product: {
              id: `gid://shopify/Product/${id}`,
              variants: {
                nodes: variants.map((v: any) => ({
                  id: `gid://shopify/ProductVariant/${v.id}`,
                  sku: v.sku,
                })),
              },
            },
            userErrors: [],
          },
        },
      })
    }
    if (query.includes('fulfillmentOrders(')) {
      const orderId = variables.id.split('/').pop()
      const nodes = this.fulfillmentOrders.get(orderId)
      return json(200, { data: { order: nodes ? { fulfillmentOrders: { nodes } } : null } })
    }
    if (query.includes('fulfillmentCreate(')) {
      const f = variables.fulfillment
      for (const line of f.lineItemsByFulfillmentOrder) {
        for (const [orderId, nodes] of this.fulfillmentOrders) {
          const node = nodes.find((n) => n.id === line.fulfillmentOrderId)
          if (node) {
            node.status = 'CLOSED'
            this.fulfillments.push({
              orderId,
              number: f.trackingInfo.number,
              company: f.trackingInfo.company,
            })
          }
        }
      }
      return json(200, {
        data: {
          fulfillmentCreate: { fulfillment: { id: 'gid://shopify/Fulfillment/1' }, userErrors: [] },
        },
      })
    }
    return json(200, { errors: [{ message: 'Unknown operation in fake' }] })
  }

  /** An orders/paid delivery signed with the app's client secret, as Shopify sends it. */
  paidOrder(order: {
    id: number
    name: string
    lines: Array<{ variantId: string; sku: string; quantity: number }>
  }) {
    const body = JSON.stringify({
      id: order.id,
      name: order.name,
      phone: null,
      line_items: order.lines.map((l) => ({
        variant_id: Number(l.variantId),
        sku: l.sku,
        title: 'Vase',
        quantity: l.quantity,
      })),
      shipping_address: {
        name: 'Ayşe Demir',
        address1: 'Bağdat Cd. 200',
        address2: null,
        city: 'Istanbul',
        province: 'Istanbul',
        zip: '34728',
        country_code: 'TR',
        phone: '+905551112233',
      },
    })
    const hmac = createHmac('sha256', this.clientSecret).update(body).digest('base64')
    return {
      body,
      headers: { 'x-shopify-hmac-sha256': hmac, 'x-shopify-topic': 'orders/paid' },
    }
  }

  connection(sellerUserId = 0) {
    const encryption = new EncryptionService()
    return new StoreConnection().merge({
      sellerUserId,
      provider: 'shopify',
      shopName: this.domain,
      externalShopId: this.domain,
      shopUrl: this.domain,
      apiKeyEnc: encryption.encrypt(this.clientId),
      apiSecretEnc: encryption.encrypt(this.clientSecret),
      status: 'active',
    })
  }
}

/** In-memory WooCommerce REST API v3 with basic-auth consumer keys. */
export class FakeWoo {
  origin = 'https://shop.example.com'
  key = 'ck_test123'
  secret = 'cs_test456'
  requests: Array<{ method: string; path: string; body: any }> = []
  webhooks: Array<{ topic: string; delivery_url: string; secret: string }> = []
  products = new Map<
    number,
    { name: string; variations: Array<{ id: number; sku: string; regular_price: string }> }
  >()
  orders = new Map<number, { status: string; notes: string[] }>()
  private seq = 500

  http: StoreHttp = async (req) => {
    const url = new URL(req.url)
    if (url.origin !== this.origin || !url.pathname.startsWith('/wp-json/wc/v3')) {
      return json(404, { code: 'rest_no_route', message: 'No route' })
    }
    const expected = `Basic ${Buffer.from(`${this.key}:${this.secret}`).toString('base64')}`
    if (req.headers.authorization !== expected) {
      return json(401, {
        code: 'woocommerce_rest_cannot_view',
        message: 'Sorry, you cannot list resources.',
      })
    }
    const path = url.pathname.slice('/wp-json/wc/v3'.length)
    const body = req.body ? JSON.parse(req.body) : undefined
    this.requests.push({ method: req.method, path, body })

    if (req.method === 'GET' && path === '/products') {
      return json(
        200,
        [...this.products.entries()].map(([id, p]) => ({
          id,
          name: p.name,
          sku: '',
          type: 'variable',
          variations: p.variations.map((v) => v.id),
        }))
      )
    }
    if (req.method === 'GET' && path === '/settings/general') {
      return json(200, [{ id: 'woocommerce_currency', value: 'EUR' }])
    }
    if (req.method === 'GET' && path === '/webhooks') return json(200, this.webhooks)
    if (req.method === 'POST' && path === '/webhooks') {
      this.webhooks.push({
        topic: body.topic,
        delivery_url: body.delivery_url,
        secret: body.secret,
      })
      return json(201, { id: ++this.seq, ...body })
    }
    if (req.method === 'POST' && path === '/products') {
      const id = ++this.seq
      this.products.set(id, { name: body.name, variations: [] })
      return json(201, { id })
    }
    let match = /^\/products\/(\d+)$/.exec(path)
    if (req.method === 'PUT' && match) {
      const product = this.products.get(Number(match[1]))
      if (!product) return json(404, { message: 'Invalid ID.' })
      product.name = body.name
      return json(200, { id: Number(match[1]) })
    }
    match = /^\/products\/(\d+)\/variations$/.exec(path)
    if (req.method === 'GET' && match) {
      return json(
        200,
        (this.products.get(Number(match[1]))?.variations ?? []).map((v) => ({
          ...v,
          attributes: [{ option: v.sku }],
        }))
      )
    }
    match = /^\/products\/(\d+)\/variations\/batch$/.exec(path)
    if (req.method === 'POST' && match) {
      const product = this.products.get(Number(match[1]))!
      const create = (body.create ?? []).map((v: any) => {
        const row = { id: ++this.seq, sku: v.sku, regular_price: v.regular_price }
        product.variations.push(row)
        return row
      })
      const update = (body.update ?? []).map((v: any) => {
        const row = product.variations.find((x) => x.id === v.id)!
        row.regular_price = v.regular_price
        return row
      })
      return json(200, { create, update })
    }
    match = /^\/orders\/(\d+)$/.exec(path)
    if (match) {
      const order = this.orders.get(Number(match[1]))
      if (!order) return json(404, { message: 'Invalid ID.' })
      if (req.method === 'PUT') order.status = body.status
      return json(200, { id: Number(match[1]), status: order.status })
    }
    match = /^\/orders\/(\d+)\/notes$/.exec(path)
    if (req.method === 'POST' && match) {
      this.orders.get(Number(match[1]))!.notes.push(body.note)
      return json(201, { id: ++this.seq })
    }
    return json(404, { code: 'rest_no_route', message: 'No route' })
  }

  /** A signed order webhook delivery exactly as WooCommerce sends it. */
  orderWebhook(
    secret: string,
    order: {
      id: number
      status: string
      lines: Array<{ variationId: number; sku: string; quantity: number }>
    }
  ) {
    const body = JSON.stringify({
      id: order.id,
      number: String(order.id),
      status: order.status,
      line_items: order.lines.map((l) => ({
        product_id: 1,
        variation_id: l.variationId,
        sku: l.sku,
        name: 'Vase',
        quantity: l.quantity,
      })),
      shipping: {
        first_name: 'Hans',
        last_name: 'Müller',
        address_1: 'Hauptstr. 1',
        address_2: '',
        city: 'Berlin',
        state: 'BE',
        postcode: '10115',
        country: 'DE',
        phone: '',
      },
      billing: { phone: '+4930123456' },
    })
    const signature = createHmac('sha256', secret).update(body).digest('base64')
    return { body, headers: { 'x-wc-webhook-signature': signature } }
  }

  connection(sellerUserId = 0) {
    const encryption = new EncryptionService()
    return new StoreConnection().merge({
      sellerUserId,
      provider: 'woocommerce',
      shopName: 'shop.example.com',
      externalShopId: 'shop.example.com',
      shopUrl: this.origin,
      apiKeyEnc: encryption.encrypt(this.key),
      apiSecretEnc: encryption.encrypt(this.secret),
      status: 'active',
    })
  }
}
