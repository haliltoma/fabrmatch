import vine from '@vinejs/vine'
import { addressRules } from '#validators/order'

/** W4: one order line from the seller's own website. */
const lineRules = () =>
  vine.object({
    productId: vine.string().uuid(),
    material: vine.string().trim().minLength(2).maxLength(20),
    color: vine.string().trim().maxLength(40).nullable().optional(),
    scalePercent: vine.number().withoutDecimals().min(10).max(300).optional(),
    quantity: vine.number().withoutDecimals().min(1).max(100),
  })

export const apiQuoteValidator = vine.create({
  lines: vine.array(lineRules()).minLength(1).maxLength(50),
})

export const apiOrderValidator = vine.create({
  // the order's id in the seller's own system: an order is placed once per id
  externalId: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(64)
    .regex(/^[\w.:#/-]+$/),
  lines: vine.array(lineRules()).minLength(1).maxLength(50),
  shippingAddress: addressRules(),
})

/** `own`: orders from the seller's own shops and website; default: sales in the Fabrmatch shop */
export const apiOrderSourceValidator = vine.create({
  source: vine.enum(['sales', 'own']).optional(),
})
