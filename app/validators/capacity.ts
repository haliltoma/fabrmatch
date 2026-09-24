import vine from '@vinejs/vine'

export const setSlotValidator = vine.create({
  date: vine.string().trim(),
  maxMinutes: vine.number().positive().max(1440),
})

export const weeklyTemplateValidator = vine.create({
  schedule: vine.object({
    0: vine.number().min(0).max(1440).optional(),
    1: vine.number().min(0).max(1440).optional(),
    2: vine.number().min(0).max(1440).optional(),
    3: vine.number().min(0).max(1440).optional(),
    4: vine.number().min(0).max(1440).optional(),
    5: vine.number().min(0).max(1440).optional(),
    6: vine.number().min(0).max(1440).optional(),
  }),
})

export const applyTemplateValidator = vine.create({
  from: vine.string().trim(),
  to: vine.string().trim(),
})
