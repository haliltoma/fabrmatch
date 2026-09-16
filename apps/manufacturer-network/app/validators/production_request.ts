import vine from '@vinejs/vine'

/** Akış 1 gövdesi (docs/09-API-SOZLESMESI.md) */
export const createProductionRequestValidator = vine.create({
  sistem_a_order_ref: vine.string().trim().minLength(1).maxLength(255),
  sistem_a_line_item_ref: vine.string().trim().minLength(1).maxLength(255),
  design_reference: vine.string().trim().minLength(1).maxLength(255),
  material: vine.string().trim().toUpperCase().minLength(2).maxLength(16),
  color: vine.string().trim().maxLength(64).nullable(),
  quantity: vine.number().withoutDecimals().min(1).max(10_000),
  buyer_region: vine.object({
    country: vine.string().trim().fixedLength(2).toUpperCase(),
    city: vine.string().trim().maxLength(120).nullable(),
  }),
  requested_delivery_by: vine.date({ formats: ['YYYY-MM-DD'] }),
  print_estimate: vine
    .object({
      slicer: vine.string().trim().maxLength(120),
      part_weight_g: vine.number().min(0),
      support_weight_g: vine.number().min(0),
      print_time_minutes: vine.number().min(0),
    })
    .nullable()
    .optional(),
})
