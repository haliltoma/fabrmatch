import vine from '@vinejs/vine'

export const apiKeyValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(80),
  // W4: read only (default), or also quote, order and cancel
  scope: vine.enum(['read', 'read_write']).optional(),
})

export const webhookEndpointValidator = vine.create({
  url: vine.string().trim().maxLength(500),
})
