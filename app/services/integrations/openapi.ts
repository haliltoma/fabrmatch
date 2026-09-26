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

const OrderItem = {
  type: 'object',
  required: ['material', 'color', 'quantity'],
  properties: {
    material: { type: 'string', example: 'PLA' },
    color: { type: ['string', 'null'], example: 'black' },
    quantity: { type: 'integer', minimum: 1 },
  },
}

export const ORDER_SCHEMA = {
  type: 'object',
  description:
    'An order for one of your products. Buyer and maker identities are never part of it.',
  required: ['id', 'code', 'status', 'currency', 'earnMinor', 'items', 'createdAt'],
  properties: {
    id: { type: 'integer' },
    code: { type: 'string', example: 'FO-8K3M2QXY' },
    status: { type: 'string', enum: ORDER_STATUSES },
    currency: { type: 'string', example: 'TRY' },
    earnMinor: money('What you earn from this order (your margin).'),
    items: { type: 'array', items: OrderItem },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

export const PRODUCT_SCHEMA = {
  type: 'object',
  required: ['id', 'title', 'status', 'currency', 'marginBps', 'createdAt'],
  properties: {
    id: { type: 'integer' },
    title: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'active', 'archived'] },
    currency: { type: 'string', example: 'TRY' },
    marginBps: { type: 'integer', description: 'Your margin in basis points (2000 = 20%).' },
    createdAt: { type: 'string', format: 'date-time' },
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
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  },
}

const errors = {
  401: {
    description: 'Missing or invalid API key (`invalid_api_key`).',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  429: {
    description: 'More than 120 requests a minute for this key (`rate_limited`).',
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
        'Read-only access to your shop orders and products, plus signed webhooks. Create keys ' +
        'and webhook endpoints in the seller panel under Developers.',
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    security: [{ apiKey: [] }],
    paths: {
      '/orders': {
        get: {
          summary: 'List your orders, newest first',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ORDER_STATUSES } },
          ],
          responses: {
            200: {
              description: 'A page of orders.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                      meta: { $ref: '#/components/schemas/PageMeta' },
                    },
                  },
                },
              },
            },
            ...errors,
          },
        },
      },
      '/orders/{id}': {
        get: {
          summary: 'One of your orders',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: {
              description: 'The order.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['data'],
                    properties: { data: { $ref: '#/components/schemas/Order' } },
                  },
                },
              },
            },
            404: {
              description: 'No such order among yours (`not_found`).',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            ...errors,
          },
        },
      },
      '/products': {
        get: {
          summary: 'Your products',
          responses: {
            200: {
              description: 'All your products.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                    },
                  },
                },
              },
            },
            ...errors,
          },
        },
      },
    },
    webhooks: {
      'order.status_changed': webhook(
        'order.status_changed',
        'An order for one of your products changed status',
        {
          type: 'object',
          required: ['previousStatus', 'order'],
          properties: {
            previousStatus: { type: 'string' },
            order: {
              type: 'object',
              required: ['id', 'code', 'status', 'currency', 'earnMinor', 'items'],
              properties: {
                id: { type: 'integer' },
                code: { type: 'string' },
                status: { type: 'string', enum: ORDER_STATUSES },
                currency: { type: 'string' },
                earnMinor: money('What you earn from this order.'),
                items: { type: 'array', items: OrderItem },
              },
            },
          },
        }
      ),
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
        Product: PRODUCT_SCHEMA,
        PageMeta,
        Error: ErrorBody,
      },
    },
  }
}
