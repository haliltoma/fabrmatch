import { test } from '@japa/runner'
import vine from '@vinejs/vine'
import { errors } from '@vinejs/vine'
import { translateValidationMessage } from '#services/i18n/validation_messages'

/** Messages name fields the way the form does, in both languages, not by their property names. */
test.group('validation field labels', () => {
  const address = vine.create({
    shippingAddress: vine.object({ line1: vine.string(), postalCode: vine.string() }),
  })

  test('nested address fields read as words, in English and in Turkish', async ({ assert }) => {
    try {
      await address.validate({ shippingAddress: {} })
      assert.fail('expected a validation error')
    } catch (error) {
      assert.instanceOf(error, errors.E_VALIDATION_ERROR)
      const messages = (error as InstanceType<typeof errors.E_VALIDATION_ERROR>).messages.map(
        (m: { message: string }) => m.message
      )
      assert.deepEqual(messages, [
        'The address field must be defined',
        'The postal code field must be defined',
      ])
      assert.deepEqual(
        messages.map((m: string) => translateValidationMessage('tr', m)),
        ['adres alanı zorunludur', 'posta kodu alanı zorunludur']
      )
    }
  })
})
