import vine from '@vinejs/vine'

export const getUploadUrlValidator = vine.create({
  originalName: vine.string().trim().minLength(1).maxLength(255),
  contentType: vine.string().trim().minLength(1).maxLength(100),
  /** signed into the upload URL; registration must report the same size */
  sizeBytes: vine.number().withoutDecimals().positive(),
})

export const registerFileValidator = vine.create({
  originalName: vine.string().trim().minLength(1).maxLength(255),
  sizeBytes: vine
    .number()
    .positive()
    .max(200 * 1024 * 1024),
  sha256: vine
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{64}$/),
  storageKey: vine.string().trim().minLength(1).maxLength(512),
  format: vine.enum(['STL', '3MF', 'OBJ'] as const),
  /** set when this upload is a new version of one of the owner's models */
  replacesFileId: vine.number().positive().withoutDecimals().optional(),
})
