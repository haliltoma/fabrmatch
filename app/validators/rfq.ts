import vine from '@vinejs/vine'
import { addressRules } from '#validators/order'

export const rfqCreateValidator = vine.create({
  modelFileId: vine.number().positive().withoutDecimals(),
  title: vine.string().trim().minLength(3).maxLength(120),
  material: vine.string().trim().toUpperCase().maxLength(32),
  color: vine.string().trim().maxLength(40).optional(),
  quantity: vine.number().withoutDecimals().min(1).max(5000),
  shipCountry: vine.string().trim().toUpperCase().fixedLength(2),
  bidDays: vine.number().withoutDecimals().min(1).max(14),
  maxLeadDays: vine.number().withoutDecimals().min(1).max(90),
  requiredTrustTier: vine.number().withoutDecimals().min(0).max(2).optional(),
})

export const rfqAwardValidator = vine.create({
  bidId: vine.number().positive().withoutDecimals(),
  shippingAddress: addressRules(),
})

export const rfqBidValidator = vine.create({
  /** per unit, TRY, as the maker types it */
  price: vine.number().positive().max(100_000),
  leadDays: vine.number().withoutDecimals().min(1).max(90),
  note: vine.string().trim().maxLength(300).optional(),
})
