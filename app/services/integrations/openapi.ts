/**
 * OpenAPI 3.1 description of the seller API (`/api/v1`) and its webhooks (R4-T12). Served at
 * `/api/v1/openapi.json`. A spec compares these schemas with real responses, so the document
 * cannot drift from the code without a failing test.
 */

export const ORDER_STATUSES = [
  'paid',
  'matching',
  'unmatched',
  'in_production',
  'shipped',
  'delivered',
  'completed',
  'disputed',
  'resolved',
  'cancelled',
] as const

const money = (description: string) => ({
  type: 'integer',
  description: `${description} In minor units (kuruş/cent) of \`currency\`.`,
})

const uuid = { type: 'string', format: 'uuid' }

const OrderItem = {
  type: 'object',
  required: ['material', 'color', 'quantity'],
  properties: {
    material: { type: 'string', example: 'PLA' },
    color: { type: ['string', 'null'], example: 'Black' },
    quantity: { type: 'integer', minimum: 1 },
  },
}

const SizedItem = {
  type: 'object',
  required: ['material', 'color', 'scalePercent', 'quantity'],
  properties: {
    ...OrderItem.properties,
    scalePercent: {
      type: 'integer',
      description: 'Size in percent of the model (100 = original).',
    },
  },
}

const Tracking = {
  type: ['object', 'null'],
  description: 'Set once the parcel left: give it to your customer.',
  required: ['carrier', 'number'],
  properties: { carrier: { type: ['string', 'null'] }, number: { type: 'string' } },
}

/** A sale of your product in the Fabrmatch shop (`GET /orders`). */
export const ORDER_SCHEMA = {
  type: 'object',
  description: 'A sale of one of your products. Buyer and maker identities are never part of it.',
  required: ['id', 'code', 'status', 'currency', 'earnMinor', 'items', 'createdAt'],
  properties: {
    id: uuid,
    code: { type: 'string', example: 'FO-8K3M2QXY' },
    status: { type: 'string', enum: ORDER_STATUSES },
    currency: { type: 'string', example: 'TRY' },
    earnMinor: money('What you earn from this order (your margin).'),
    items: { type: 'array', items: OrderItem },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

/** An order with your own id and tracking (`GET /orders/{id}`, `POST /orders`, `?source=own`). */
export const API_ORDER_SCHEMA = {
  type: 'object',
  description: 'One of your orders. Production starts once `paid` is true.',
  required: [
    'id',
    'code',
    'externalId',
    'channel',
    'status',
    'paid',
    'currency',
    'totalMinor',
    'earnMinor',
    'items',
    'tracking',
    'createdAt',
  ],
  properties: {
    id: uuid,
    code: { type: 'string', example: 'FO-8K3M2QXY' },
    externalId: { type: ['string', 'null'], description: 'Your id for it (shop or API orders).' },
    channel: {
      type: 'string',
      enum: [
        'storefront',
        'shopify',
        'etsy',
        'woocommerce',
        'wix',
        'api',
        'sample',
        'direct',
        'rfq',
      ],
    },
    status: { type: 'string', enum: ['draft', 'awaiting_payment', ...ORDER_STATUSES] },
    paid: { type: 'boolean' },
    currency: { type: 'string', example: 'TRY' },
    totalMinor: money('What the order costs (what you pay for orders from your shop or site).'),
    earnMinor: money('Your margin on a sale in the Fabrmatch shop; 0 on your own orders.'),
    items: { type: 'array', items: SizedItem },
    tracking: Tracking,
    createdAt: { type: 'string', format: 'date-time' },
  },
}

export const PRODUCT_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'title',
    'description',
    'status',
    'shopListed',
    'marginBps',
    'ownDesign',
    'tags',
    'materials',
    'variants',
    'colours',
    'images',
    'createdAt',
  ],
  properties: {
    id: uuid,
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    status: { type: 'string', enum: ['draft', 'active'] },
    shopListed: { type: 'boolean', description: 'Also sold in the Fabrmatch shop.' },
    marginBps: { type: 'integer', description: 'Your margin in basis points (2000 = 20%).' },
    ownDesign: { type: 'boolean', description: 'Made from a model you uploaded.' },
    tags: { type: 'array', items: { type: 'string' } },
    materials: { type: 'array', items: { type: 'string' } },
    variants: {
      type: 'array',
      description: 'Every material × size, with what one piece costs you delivered in Türkiye.',
      items: {
        type: 'object',
        required: ['material', 'scalePercent', 'size', 'costMinor', 'suggestedPriceMinor'],
        properties: {
          material: { type: 'string' },
          scalePercent: { type: 'integer' },
          size: { type: 'string', example: '62 × 62 × 83 mm' },
          costMinor: { type: ['integer', 'null'], description: 'TRY kuruş, no margin.' },
          suggestedPriceMinor: { type: ['integer', 'null'], description: 'Cost plus your margin.' },
        },
      },
    },
    colours: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'hex'],
        properties: { name: { type: 'string' }, hex: { type: 'string' } },
      },
    },
    images: {
      type: 'array',
      description: 'Pictures on our domain; link them from your site or download them.',
      items: {
        type: 'object',
        required: ['url', 'kind', 'angle', 'color'],
        properties: {
          url: { type: 'string', format: 'uri' },
          kind: { type: 'string', enum: ['render', 'maker_photo', 'colour_render'] },
          angle: { type: ['integer', 'null'] },
          color: { type: ['string', 'null'] },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

const Line = {
  type: 'object',
  required: ['productId', 'material', 'quantity'],
  properties: {
    productId: uuid,
    material: { type: 'string', example: 'PLA' },
    color: { type: ['string', 'null'], example: 'Black' },
    scalePercent: { type: 'integer', default: 100 },
    quantity: { type: 'integer', minimum: 1, maximum: 100 },
  },
}

const Address = {
  type: 'object',
  required: ['fullName', 'line1', 'city', 'postalCode', 'country'],
  properties: {
    fullName: { type: 'string' },
    line1: { type: 'string' },
    line2: { type: 'string' },
    district: { type: 'string' },
    city: { type: 'string' },
    postalCode: { type: 'string' },
    country: { type: 'string', example: 'TR' },
    phone: { type: 'string', description: 'For the courier.' },
  },
}

/** What a webhook says about an order (W4: also `externalId`, sizes, total and tracking). */
const WEBHOOK_ORDER = {
  type: 'object',
  required: [
    'id',
    'code',
    'externalId',
    'channel',
    'status',
    'currency',
    'totalMinor',
    'earnMinor',
    'items',
    'tracking',
  ],
  properties: {
    id: uuid,
    code: { type: 'string' },
    externalId: { type: ['string', 'null'] },
    channel: { type: 'string' },
    status: { type: 'string' },
    currency: { type: 'string' },
    totalMinor: money('What the order costs.'),
    earnMinor: money('What you earn from this order.'),
    items: { type: 'array', items: SizedItem },
    tracking: Tracking,
  },
}

const PageMeta = {
  type: 'object',
  required: ['page', 'perPage', 'total', 'pages'],
  properties: {
    page: { type: 'integer' },
    perPage: { type: 'integer' },
    total: { type: 'integer' },
    pages: { type: 'integer' },
  },
}

const ErrorBody = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        field: { type: ['string', 'null'], description: 'What to fix, e.g. `lines.0.material`.' },
      },
    },
  },
}

const json = (schema: unknown, description: string) => ({
  description,
  content: { 'application/json': { schema } },
})
const errorRef = { $ref: '#/components/schemas/Error' }
const dataOf = (schema: unknown) => ({
  type: 'object',
  required: ['data'],
  properties: { data: schema },
})

const errors = {
  401: {
    description: 'Missing or invalid API key (`invalid_api_key`).',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  429: {
    description:
      'More than 120 requests (30 quotes/orders/cancels) a minute for this key (`rate_limited`).',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
}

const webhook = (type: string, summary: string, data: Record<string, unknown>) => ({
  post: {
    summary,
    description:
      'Sent as JSON to your endpoint. Verify `Fabrmatch-Signature` before trusting the body: ' +
      '`t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with your endpoint secret>`. ' +
      'Reject timestamps older than 5 minutes, compare in constant time, and de-duplicate by ' +
      '`Fabrmatch-Event-Id` (deliveries are retried up to 8 times with backoff). Answer 2xx fast.',
    parameters: [
      { name: 'Fabrmatch-Signature', in: 'header', required: true, schema: { type: 'string' } },
      { name: 'Fabrmatch-Event-Id', in: 'header', required: true, schema: { type: 'string' } },
      {
        name: 'Fabrmatch-Event-Type',
        in: 'header',
        required: true,
        schema: { type: 'string', const: type },
      },
      {
        name: 'Fabrmatch-Delivery-Attempt',
        in: 'header',
        required: true,
        schema: { type: 'integer' },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['id', 'type', 'createdAt', 'data'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string', const: type },
              createdAt: { type: 'string', format: 'date-time' },
              data,
            },
          },
        },
      },
    },
    responses: { '2XX': { description: 'Received. Anything else is retried.' } },
  },
})

export function openApiDocument(baseUrl: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Fabrmatch seller API',
      version: '1',
      description:
        'Sell from your own website: read your products (variants, costs, pictures), quote and ' +
        'place orders we print and ship to your customer, and hear back through signed webhooks. ' +
        'Create keys (read only, or read and order) and webhook endpoints in the seller panel ' +
        'under Developers.',
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    security: [{ apiKey: [] }],
    paths: {
      '/orders': {
        get: {
          summary: 'List orders, newest first',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ORDER_STATUSES } },
            {
              name: 'source',
              in: 'query',
              description:
                '`sales` (default): sales in the Fabrmatch shop. `own`: orders from your own shops and website.',
              schema: { type: 'string', enum: ['sales', 'own'] },
            },
          ],
          responses: {
            200: json(
              {
                type: 'object',
                required: ['data', 'meta'],
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      oneOf: [
                        { $ref: '#/components/schemas/Order' },
                        { $ref: '#/components/schemas/ApiOrder' },
                      ],
                    },
                  },
                  meta: { $ref: '#/components/schemas/PageMeta' },
                },
              },
              'A page of orders (`Order` for sales, `ApiOrder` with `source=own`).'
            ),
            ...errors,
          },
        },
        post: {
          summary: 'Place an order we print and ship to your customer (read_write key)',
          description:
            'Placed once per `externalId`: sending the same id again returns the same order (200), so retrying is safe. ' +
            'Paid from your balance when it covers the order; otherwise pay it in the seller panel.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['externalId', 'lines', 'shippingAddress'],
                  properties: {
                    externalId: { type: 'string', maxLength: 64, example: 'web-1042' },
                    lines: { type: 'array', items: Line, minItems: 1, maxItems: 50 },
                    shippingAddress: Address,
                  },
                },
              },
            },
          },
          responses: {
            201: json(dataOf({ $ref: '#/components/schemas/ApiOrder' }), 'Placed.'),
            200: json(dataOf({ $ref: '#/components/schemas/ApiOrder' }), 'Placed before.'),
            403: json(errorRef, 'The key may only read (`insufficient_scope`).'),
            404: json(errorRef, 'A line names a product that is not yours.'),
            422: json(
              errorRef,
              'A line or the address cannot be ordered; `error.field` says which.'
            ),
            ...errors,
          },
        },
      },
      '/orders/{id}': {
        get: {
          summary: 'One of your orders, with its tracking once shipped',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }],
          responses: {
            200: json(dataOf({ $ref: '#/components/schemas/ApiOrder' }), 'The order.'),
            404: json(errorRef, 'No such order among yours (`not_found`).'),
            ...errors,
          },
        },
      },
      '/orders/{id}/cancel': {
        post: {
          summary: 'Cancel an order before a maker starts (read_write key)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }],
          responses: {
            200: json(
              dataOf({ $ref: '#/components/schemas/ApiOrder' }),
              'Cancelled; any payment is refunded.'
            ),
            404: json(errorRef, 'No such order of yours (`not_found`).'),
            409: json(errorRef, 'Already in production (`not_cancellable`).'),
            ...errors,
          },
        },
      },
      '/products': {
        get: {
          summary: 'Your products with variants, costs, colours and pictures',
          responses: {
            200: json(
              dataOf({ type: 'array', items: { $ref: '#/components/schemas/Product' } }),
              'Your products (archived ones left out).'
            ),
            ...errors,
          },
        },
      },
      '/products/{id}': {
        get: {
          summary: 'One of your products',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }],
          responses: {
            200: json(dataOf({ $ref: '#/components/schemas/Product' }), 'The product.'),
            404: json(errorRef, 'No such product among yours (`not_found`).'),
            ...errors,
          },
        },
      },
      '/catalog/options': {
        get: {
          summary: 'Materials and colours you can order',
          responses: {
            200: json(
              dataOf({
                type: 'object',
                required: ['materials', 'colours', 'sizes', 'deliversAbroad', 'currency'],
                properties: {
                  materials: { type: 'array', items: { type: 'object' } },
                  colours: { type: 'array', items: { type: 'object' } },
                  sizes: { type: 'object' },
                  deliversAbroad: { type: 'boolean' },
                  currency: { type: 'string' },
                },
              }),
              'The options.'
            ),
            ...errors,
          },
        },
      },
      '/quotes': {
        post: {
          summary: 'What lines would cost you, delivered in Türkiye (read_write key)',
          description: 'An estimate: the order itself is priced with the full address.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['lines'],
                  properties: { lines: { type: 'array', items: Line, minItems: 1, maxItems: 50 } },
                },
              },
            },
          },
          responses: {
            200: json(
              dataOf({
                type: 'object',
                required: ['currency', 'estimate', 'lines', 'totalMinor'],
                properties: {
                  currency: { type: 'string', const: 'TRY' },
                  estimate: { type: 'boolean', const: true },
                  totalMinor: money('All lines.'),
                  lines: { type: 'array', items: { type: 'object' } },
                },
              }),
              'The quote.'
            ),
            403: json(errorRef, 'The key may only read (`insufficient_scope`).'),
            422: json(errorRef, 'A line cannot be ordered; `error.field` says which.'),
            ...errors,
          },
        },
      },
    },
    webhooks: {
      'order.status_changed': webhook('order.status_changed', 'An order of yours changed status', {
        type: 'object',
        required: ['previousStatus', 'order'],
        properties: { previousStatus: { type: 'string' }, order: WEBHOOK_ORDER },
      }),
      'order.created': webhook(
        'order.created',
        'An order from your own shop or website was placed',
        { type: 'object', required: ['order'], properties: { order: WEBHOOK_ORDER } }
      ),
      'order.shipped': webhook(
        'order.shipped',
        'An order left with the courier; `order.tracking` has the number for your customer',
        { type: 'object', required: ['order'], properties: { order: WEBHOOK_ORDER } }
      ),
      'order.cancelled': webhook('order.cancelled', 'An order was cancelled (and refunded)', {
        type: 'object',
        required: ['order'],
        properties: { order: WEBHOOK_ORDER },
      }),
      'webhook.test': webhook('webhook.test', 'Sent when you press "Send test" in the panel', {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string' } },
      }),
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: 'http',
          scheme: 'bearer',
          description: 'An API key from the seller panel: `Authorization: Bearer fmk_…`.',
        },
      },
      schemas: {
        Order: ORDER_SCHEMA,
        ApiOrder: API_ORDER_SCHEMA,
        Product: PRODUCT_SCHEMA,
        PageMeta,
        Error: ErrorBody,
      },
    },
  }
}
