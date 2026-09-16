import Manufacturer from '#models/manufacturer'
import MatchOffer from '#models/match_offer'
import OutboundWebhookEvent from '#models/outbound_webhook_event'
import ProductionRequest from '#models/production_request'
import User from '#models/user'
import { intakeProductionRequest } from '#services/production_request_intake'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createManufacturer, productionRequestBody } from '#tests/helpers'

async function offeredJob() {
  const manufacturer = await createManufacturer()
  const user = await User.findOrFail(manufacturer.userId)
  const { request } = await intakeProductionRequest({
    ...productionRequestBody(),
    requested_delivery_by: DateTime.fromISO('2099-01-01'),
  })
  const offer = await MatchOffer.query().where('production_request_id', request.id).firstOrFail()
  return { manufacturer, user, request, offer }
}

test.group('Manufacturer panel', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('guests are sent to the login page', async ({ client }) => {
    const response = await client.get('/panel').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('a user without a manufacturer profile is sent to onboarding', async ({ client }) => {
    const user = await User.create({ email: 'new-maker@fabrmatch.test', password: 'test-password-1' })

    const response = await client.get('/panel').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/panel/onboarding')
  })

  test('onboarding creates a pending manufacturer with an anonymous public code', async ({ client, assert }) => {
    const user = await User.create({ email: 'onboard@fabrmatch.test', password: 'test-password-1' })

    const response = await client
      .post('/panel/onboarding')
      .loginAs(user)
      .withCsrfToken()
      .form({
        displayName: 'Mersin Baskı Atölyesi',
        countryCode: 'tr',
        city: 'Mersin',
        materials: ['PLA', 'PETG'],
        maxBuildXMm: '250',
        maxBuildYMm: '210',
        maxBuildZMm: '220',
        dailyCapacityGrams: '1500',
        pricePerGram: '0.85',
        hourlyRate: '18',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/panel')
    const manufacturer = await Manufacturer.query().where('user_id', user.id).firstOrFail()
    assert.equal(manufacturer.status, 'pending')
    assert.equal(manufacturer.countryCode, 'TR')
    assert.deepEqual(manufacturer.materials, ['PLA', 'PETG'])
    assert.match(manufacturer.publicCode, /^FM-[0-9A-F]{6}$/)
  })

  test('the dashboard lists offers without exposing buyer identity', async ({ client }) => {
    const { user, offer, request } = await offeredJob()

    const response = await client.get('/panel').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('panel/dashboard')
    response.assertInertiaPropsContains({
      offers: [
        {
          id: offer.id,
          quotedPayout: 156.93,
          job: { id: request.id, material: 'PLA', quantity: 2, buyerCity: 'Mersin', buyerCountry: 'TR' },
        },
      ],
    })
  })

  test('accepting an offer from the panel starts production tracking', async ({ client, assert }) => {
    const { user, offer, request } = await offeredJob()

    const response = await client
      .post(`/panel/offers/${offer.id}/accept`)
      .loginAs(user)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/panel/requests/${request.id}`)
    await request.refresh()
    assert.equal(request.status, 'accepted')
    const events = await OutboundWebhookEvent.query().where('production_request_id', request.id)
    assert.deepEqual(
      events.map((event) => event.status),
      ['accepted']
    )

    const detail = await client.get(`/panel/requests/${request.id}`).loginAs(user).withInertia()
    detail.assertInertiaComponent('panel/request')
    detail.assertInertiaPropsContains({ openOfferId: null, job: { status: 'accepted', payout: 156.93 } })
  })

  test('another manufacturer cannot open or act on the job', async ({ client, assert }) => {
    const { offer, request } = await offeredJob()
    const other = await createManufacturer({ city: 'Adana' })
    const otherUser = await User.findOrFail(other.userId)

    const view = await client.get(`/panel/requests/${request.id}`).loginAs(otherUser).redirects(0)
    view.assertStatus(302)
    view.assertHeader('location', '/panel')

    await client.post(`/panel/offers/${offer.id}/accept`).loginAs(otherUser).withCsrfToken().redirects(0)
    const unchanged = await ProductionRequest.findOrFail(request.id)
    assert.equal(unchanged.status, 'awaiting_acceptance')
  })

  test('quality_check without any photo shows a friendly error instead of crashing', async ({
    client,
    assert,
  }) => {
    const { manufacturer, user, offer, request } = await offeredJob()
    await client.post(`/panel/offers/${offer.id}/accept`).loginAs(user).withCsrfToken()
    await client
      .post(`/panel/requests/${request.id}/steps`)
      .loginAs(user)
      .withCsrfToken()
      .form({ status: 'in_production' })

    const empty = await client
      .post(`/panel/requests/${request.id}/steps`)
      .loginAs(user)
      .withCsrfToken()
      .form({ status: 'quality_check', photos: '   \n  ' })
      .redirects(0)
    empty.assertStatus(302)
    let unchanged = await ProductionRequest.findOrFail(request.id)
    assert.equal(unchanged.status, 'in_production')

    const invalid = await client
      .post(`/panel/requests/${request.id}/steps`)
      .loginAs(user)
      .withCsrfToken()
      .form({ status: 'quality_check', photos: 'not-a-url' })
      .redirects(0)
    invalid.assertStatus(302)
    unchanged = await ProductionRequest.findOrFail(request.id)
    assert.equal(unchanged.status, 'in_production')

    const valid = await client
      .post(`/panel/requests/${request.id}/steps`)
      .loginAs(user)
      .withCsrfToken()
      .form({ status: 'quality_check', photos: 'https://cdn.fabrmatch.test/qc.jpg' })
      .redirects(0)
    valid.assertStatus(302)
    const updated = await ProductionRequest.findOrFail(request.id)
    assert.equal(updated.status, 'quality_check')
    assert.deepEqual(updated.productionPhotos, ['https://cdn.fabrmatch.test/qc.jpg'])
    assert.equal(manufacturer.id, updated.manufacturerId)
  })
})
