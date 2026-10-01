import vine from '@vinejs/vine'
import { moneyMinor } from '#validators/money'

export const finishingCreateValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(32),
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(300).optional(),
  /** per unit, TRY, as the admin types it */
  price: moneyMinor({ min: 0, max: 1_000_000 }),
  materials: vine.string().trim().maxLength(200).optional(),
})

export const finishingUpdateValidator = vine.create({
  price: moneyMinor({ min: 0, max: 1_000_000 }).optional(),
  isActive: vine.boolean().optional(),
  extraDays: vine.number().withoutDecimals().min(0).max(30).optional(),
})

export const makerFinishingValidator = vine.create({
  optionIds: vine.array(vine.string().uuid()).maxLength(50),
})
