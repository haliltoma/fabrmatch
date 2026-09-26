import vine from '@vinejs/vine'

export const testCardValidator = vine.create({
  number: vine.string().trim().minLength(12).maxLength(23),
  expiry: vine
    .string()
    .trim()
    .regex(/^\d{2}\s*\/\s*\d{2}$/),
  cvc: vine.string().trim().minLength(3).maxLength(4),
  name: vine.string().trim().minLength(2).maxLength(100),
})
