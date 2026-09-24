import vine from '@vinejs/vine'

export const apiKeyValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(80),
})

export const webhookEndpointValidator = vine.create({
  url: vine.string().trim().maxLength(500),
})
