import { createHash, createHmac } from 'node:crypto'
import { DateTime } from 'luxon'
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
    { title: string; variants: Array<{ id: string; sku: string; price: string }>; status?: string }
  >()
  fulfillmentOrders = new Map<string, Array<{ id: string; status: string }>>()
  fulfillments: Array<{ orderId: string; number: string; company: string }> = []
  /** orders cancelled through the API (V6) */
  cancelled: string[] = []
  /** variants per GraphQL page (Shopify: 250; tests lower it to exercise the cursor) */
  pageSize = 250
  private seq = 1000

  http: StoreHttp = async (req: StoreHttpRequest) => {
    const url = new URL(req.url)
    if (url.host !== this.domain) return json(404, { errors: 'Not Found' })

    if (url.pathname === '/admin/oauth/access_token') {
      const form = new URLSearchParams(String(req.body ?? ''))
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
    const { query, variables } = JSON.parse(String(req.body ?? '{}'))
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
      // real pagination: `pageSize` per page, cursor = index of the next node
      const start = variables.after ? Number(variables.after) : 0
      const slice = nodes.slice(start, start + this.pageSize)
      const next = start + this.pageSize
      return json(200, {
        data: {
          productVariants: {
            nodes: slice,
            pageInfo: {
              hasNextPage: next < nodes.length,
              endCursor: next < nodes.length ? String(next) : null,
            },
          },
        },
      })
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
      this.products.set(id, { title: input.title, variants, status: input.status })
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
    if (query.includes('productUpdate(')) {
      const id = variables.product.id.split('/').pop()
      const product = this.products.get(id)
      if (!product) {
        return json(200, {
          data: {
            productUpdate: {
              product: null,
              userErrors: [{ field: ['id'], message: 'Product does not exist' }],
            },
          },
        })
      }
      product.status = variables.product.status
      return json(200, {
        data: {
          productUpdate: {
            product: { id: variables.product.id, status: product.status },
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
    if (query.includes('orderCancel(')) {
      this.cancelled.push(variables.orderId.split('/').pop())
      return json(200, {
        data: { orderCancel: { job: { id: 'gid://shopify/Job/1' }, orderCancelUserErrors: [] } },
      })
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

  /** An orders/cancelled delivery. */
  cancelledOrder(id: number) {
    const body = JSON.stringify({ id, name: `#${id}`, cancelled_at: new Date().toISOString() })
    const hmac = createHmac('sha256', this.clientSecret).update(body).digest('base64')
    return {
      body,
      headers: { 'x-shopify-hmac-sha256': hmac, 'x-shopify-topic': 'orders/cancelled' },
    }
  }

  connection(sellerUserId = '00000000-0000-7000-8000-000000000000') {
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
    {
      name: string
      variations: Array<{ id: number; sku: string; regular_price: string }>
      status?: string
    }
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
    const body = req.body ? JSON.parse(String(req.body)) : undefined
    this.requests.push({ method: req.method, path, body })

    if (req.method === 'GET' && path === '/products') {
      const page = Number(url.searchParams.get('page') ?? '1')
      const perPage = Number(url.searchParams.get('per_page') ?? '10')
      return json(
        200,
        [...this.products.entries()].slice((page - 1) * perPage, page * perPage).map(([id, p]) => ({
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
      this.products.set(id, { name: body.name, variations: [], status: body.status })
      return json(201, { id })
    }
    let match = /^\/products\/(\d+)$/.exec(path)
    if (req.method === 'PUT' && match) {
      const product = this.products.get(Number(match[1]))
      if (!product) return json(404, { message: 'Invalid ID.' })
      if (body.name) product.name = body.name
      if (body.status) product.status = body.status
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

  connection(sellerUserId = '00000000-0000-7000-8000-000000000000') {
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

/**
 * In-memory Etsy Open API v3: OAuth token endpoint, shop/listing/inventory/receipt endpoints the
 * adapter uses, checking `x-api-key: keystring:shared_secret` and the bearer token.
 */
export class FakeEtsy {
  keystring = 'etsy-keystring'
  sharedSecret = 'etsy-shared-secret'
  userId = 4242
  shopId = 8181
  codes = new Map<string, string>() // code -> code_challenge
  tokens: string[] = []
  refreshTokens: string[] = []
  listings = new Map<
    number,
    {
      title: string
      state: string
      taxonomyId: number
      products: Array<{ product_id: number; sku: string; material: string; price: number }>
      images: number
    }
  >()
  receipts = new Map<number, any>()
  requests: Array<{ method: string; path: string }> = []
  private seq = 90_000

  http: StoreHttp = async (req) => {
    const url = new URL(req.url)
    const path = url.pathname
    this.requests.push({ method: req.method, path })
    if (url.origin !== 'https://api.etsy.com') return json(404, { error: 'not found' })

    if (path === '/v3/public/oauth/token') {
      const form = new URLSearchParams(String(req.body ?? ''))
      if (form.get('client_id') !== this.keystring) return json(400, { error: 'invalid_client' })
      if (form.get('grant_type') === 'authorization_code') {
        const challenge = this.codes.get(form.get('code') ?? '')
        const verifier = form.get('code_verifier') ?? ''
        const expected = createHash('sha256').update(verifier).digest('base64url')
        if (!challenge || challenge !== expected) return json(400, { error: 'invalid_grant' })
        this.codes.delete(form.get('code')!)
      } else if (form.get('grant_type') === 'refresh_token') {
        if (!this.refreshTokens.includes(form.get('refresh_token') ?? '')) {
          return json(400, { error: 'invalid_grant' })
        }
      } else {
        return json(400, { error: 'unsupported_grant_type' })
      }
      const access = `${this.userId}.access${++this.seq}`
      const refresh = `${this.userId}.refresh${++this.seq}`
      this.tokens.push(access)
      this.refreshTokens.push(refresh)
      return json(200, {
        access_token: access,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refresh,
      })
    }

    if (req.headers['x-api-key'] !== `${this.keystring}:${this.sharedSecret}`) {
      return json(403, { error: 'Invalid API key' })
    }
    if (path === '/v3/application/seller-taxonomy/nodes') {
      return json(200, {
        count: 1,
        results: [
          {
            id: 1,
            name: 'Home & Living',
            children: [
              {
                id: 1027,
                name: 'Home Decor',
                children: [{ id: 1029, name: 'Vases', children: [] }],
              },
            ],
          },
        ],
      })
    }
    const bearer = (req.headers.authorization ?? '').replace('Bearer ', '')
    if (!this.tokens.includes(bearer)) return json(401, { error: 'invalid_token' })

    const shop = `/v3/application/shops/${this.shopId}`
    if (path === '/v3/application/users/me')
      return json(200, { user_id: this.userId, shop_id: this.shopId })
    if (path === shop)
      return json(200, { shop_id: this.shopId, shop_name: 'PrintNest', currency_code: 'USD' })
    if (path === `${shop}/readiness-state-definitions`) {
      return json(200, { count: 1, results: [{ shop_id: this.shopId, readiness_state_id: 777 }] })
    }
    if (path === `${shop}/shipping-profiles`) {
      return json(200, { count: 1, results: [{ shipping_profile_id: 888 }] })
    }
    if (req.method === 'GET' && path === `${shop}/listings`) {
      const state = url.searchParams.get('state')
      const results = [...this.listings.entries()]
        .filter(([, l]) => !state || l.state === state)
        .map(([id, l]) => ({ listing_id: id, title: l.title, state: l.state }))
      return json(200, { count: results.length, results })
    }
    if (req.method === 'POST' && path === `${shop}/listings`) {
      const form = new URLSearchParams(String(req.body ?? ''))
      for (const field of [
        'quantity',
        'title',
        'description',
        'price',
        'who_made',
        'when_made',
        'taxonomy_id',
      ]) {
        if (!form.get(field)) return json(400, { error: `${field} is required` })
      }
      const id = ++this.seq
      this.listings.set(id, {
        title: form.get('title')!,
        state: 'draft',
        taxonomyId: Number(form.get('taxonomy_id')),
        products: [],
        images: 0,
      })
      return json(201, { listing_id: id, state: 'draft', shop_id: this.shopId })
    }
    let m = new RegExp(`^${shop}/listings/(\\d+)$`).exec(path)
    if (req.method === 'PATCH' && m) {
      const listing = this.listings.get(Number(m[1]))
      if (!listing) return json(404, { error: 'listing not found' })
      const form = new URLSearchParams(String(req.body ?? ''))
      if (form.get('state') === 'active' && listing.images === 0) {
        return json(400, { error: 'An image is required to activate' })
      }
      if (form.get('state')) listing.state = form.get('state')!
      if (form.get('title')) listing.title = form.get('title')!
      return json(200, { listing_id: Number(m[1]), state: listing.state })
    }
    m = /^\/v3\/application\/listings\/(\d+)\/inventory$/.exec(path)
    if (m) {
      const listing = this.listings.get(Number(m[1]))
      if (!listing) return json(404, { error: 'listing not found' })
      if (req.method === 'PUT') {
        const body = JSON.parse(String(req.body))
        listing.products = body.products.map((p: any) => ({
          product_id: listing.products.find((x) => x.sku === p.sku)?.product_id ?? ++this.seq,
          sku: p.sku,
          material: p.property_values[0].values[0],
          price: p.offerings[0].price,
        }))
      }
      return json(200, {
        products: listing.products.map((p) => ({
          product_id: p.product_id,
          sku: p.sku,
          is_deleted: false,
          property_values: [{ property_id: 513, values: [p.material] }],
          offerings: [{ price: { amount: Math.round(p.price * 100), divisor: 100 } }],
        })),
      })
    }
    m = new RegExp(`^${shop}/listings/(\\d+)/images$`).exec(path)
    if (req.method === 'POST' && m) {
      const listing = this.listings.get(Number(m[1]))!
      if (!Buffer.isBuffer(req.body)) return json(400, { error: 'image must be a file' })
      listing.images++
      return json(201, { listing_image_id: ++this.seq })
    }
    if (req.method === 'GET' && path === `${shop}/receipts`) {
      const min = Number(url.searchParams.get('min_last_modified') ?? '0')
      const results = [...this.receipts.values()].filter((r) => r.updated_timestamp >= min)
      return json(200, { count: results.length, results })
    }
    m = new RegExp(`^${shop}/receipts/(\\d+)$`).exec(path)
    if (req.method === 'GET' && m) {
      const receipt = this.receipts.get(Number(m[1]))
      return receipt ? json(200, receipt) : json(404, { error: 'receipt not found' })
    }
    m = new RegExp(`^${shop}/receipts/(\\d+)/tracking$`).exec(path)
    if (req.method === 'POST' && m) {
      const receipt = this.receipts.get(Number(m[1]))!
      const body = JSON.parse(String(req.body))
      receipt.is_shipped = true
      receipt.shipments = [
        ...(receipt.shipments ?? []),
        { tracking_code: body.tracking_code, carrier_name: body.carrier_name },
      ]
      return json(200, receipt)
    }
    return json(404, { error: `no route ${req.method} ${path}` })
  }

  /** What Etsy's consent page would do: remember the challenge, send back a code. */
  authorize(authorizeUrl: string) {
    const url = new URL(authorizeUrl)
    const code = `code${++this.seq}`
    this.codes.set(code, url.searchParams.get('code_challenge')!)
    return { code, state: url.searchParams.get('state')! }
  }

  /** A paid (or cancelled) receipt in the shop. */
  receipt(
    id: number,
    lines: Array<{ productId: string; sku: string | null; quantity: number }>,
    status = 'paid'
  ) {
    this.receipts.set(id, {
      receipt_id: id,
      status,
      is_paid: status === 'paid',
      is_shipped: false,
      name: 'Jane Doe',
      first_line: '1 Main St',
      second_line: null,
      city: 'Portland',
      state: 'OR',
      zip: '97201',
      country_iso: 'US',
      updated_timestamp: Math.floor(Date.now() / 1000),
      transactions: lines.map((l) => ({
        product_id: Number(l.productId),
        sku: l.sku ?? '',
        title: 'Vase',
        quantity: l.quantity,
      })),
    })
  }

  connection(sellerUserId = '00000000-0000-7000-8000-000000000000') {
    const encryption = new EncryptionService()
    const access = `${this.userId}.seed${++this.seq}`
    const refresh = `${this.userId}.seedrefresh${++this.seq}`
    this.tokens.push(access)
    this.refreshTokens.push(refresh)
    return new StoreConnection().merge({
      sellerUserId,
      provider: 'etsy',
      shopName: 'PrintNest',
      externalShopId: String(this.shopId),
      accessTokenEnc: encryption.encrypt(access),
      refreshTokenEnc: encryption.encrypt(refresh),
      tokenExpiresAt: DateTime.now().plus({ hours: 1 }),
      status: 'active',
    })
  }
}
