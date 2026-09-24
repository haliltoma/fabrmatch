import vine from '@vinejs/vine'

export const codeValidator = vine.create({ code: vine.string().trim().minLength(6).maxLength(20) })

export const disableTwoFactorValidator = vine.create({
  password: vine.string(),
  code: vine.string().trim().minLength(6).maxLength(20),
})

export const changePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: vine.string().minLength(8).maxLength(32).confirmed({
    confirmationField: 'passwordConfirmation',
  }),
  passwordConfirmation: vine.string(),
})
