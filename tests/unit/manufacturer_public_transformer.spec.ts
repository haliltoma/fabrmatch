import { test } from '@japa/runner'
import ManufacturerPublicTransformer from '#transformers/manufacturer_public_transformer'
import ManufacturerProfile from '#models/manufacturer_profile'
import app from '@adonisjs/core/services/app'
import { uid } from '#tests/helpers/ids'

test.group('ManufacturerPublicTransformer', () => {
  test('exposes only public alias, trust tier, and score', async ({ assert }) => {
    const profile = new ManufacturerProfile()
    profile.publicAlias = 'FM-A1B2'
    profile.trustTier = 2
    profile.score = 85
    profile.city = 'Istanbul'
    profile.country = 'TR'
    profile.ibanEnc = 'encrypted-iban-data'
    profile.taxIdEnc = 'encrypted-tax-id'
    profile.userId = uid(99)

    const item = ManufacturerPublicTransformer.transform(profile)
    const result = await item.resolve(app.container.createResolver(), 0)

    assert.equal(result.publicAlias, 'FM-A1B2')
    assert.equal(result.trustTier, 2)
    assert.equal(result.score, 85)

    // Must NOT contain identity information
    assert.notProperty(result, 'city')
    assert.notProperty(result, 'country')
    assert.notProperty(result, 'ibanEnc')
    assert.notProperty(result, 'taxIdEnc')
    assert.notProperty(result, 'userId')
    assert.notProperty(result, 'email')
  })
})
