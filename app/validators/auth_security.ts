import vine from '@vinejs/vine'

export const forgotPasswordValidator = vine.create({
  email: vine.string().email().maxLength(254),
})

export const resetPasswordValidator = vine.create({
  token: vine.string().minLength(64).maxLength(64),
  password: vine.string().minLength(8).maxLength(32).confirmed({
    confirmationField: 'passwordConfirmation',
  }),
  passwordConfirmation: vine.string(),
})

export const verifyEmailValidator = vine.create({
  token: vine.string().minLength(64).maxLength(64),
})
