import MatchOffer from '#models/match_offer'
import OutboundWebhookEvent from '#models/outbound_webhook_event'
import { acceptOffer } from '#services/production_lifecycle'
import { intakeProductionRequest } from '#services/production_request_intake'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createManufacturer, productionRequestBody, SERVICE_HEADERS } from '#tests/helpers'

async function acceptedRequestEvent() {
  await createManufacturer()
  const { request } = await intakeProductionRequest({
    ...productionRequestBody(),
    requested_delivery_by: DateTime.fromISO('2099-01-01'),
  })
  const offer = await MatchOffer.query().where('production_request_id', request.id).firstOrFail()
  return { request, event: await acceptOffer(offer.manufacturerId, offer.id) }
}

test.group('API v1 · webhook events (Akış 3, uzlaştırma)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('rejects calls without a valid service key', async ({ client }) => {
    const response = await client.get('/api/v1/webhook-events').headers({ authorization: 'Bearer wrong' })

    response.assertStatus(401)
  })

  test('only lists events that reached a final state', async ({ client, assert }) => {
    const { request, event } = await acceptedRequestEvent()

    const beforeDelivery = await client.get('/api/v1/webhook-events').headers(SERVICE_HEADERS)
    assert.deepEqual(
      beforeDelivery.body().events.filter((e: { event_id: string }) => e.event_id === event.publicId),
      []
    )

    await OutboundWebhookEvent.query().where('id', event.id).update({ state: 'delivered' })

    const response = await client.get('/api/v1/webhook-events').headers(SERVICE_HEADERS)
    response.assertStatus(200)
    const match = response.body().events.find((e: { event_id: string }) => e.event_id === event.publicId)
    assert.exists(match)
    assert.equal(match.production_request_id, request.publicId)
    assert.equal(match.status, 'accepted')
    assert.equal(match.state, 'delivered')
  })

  test('respects the since filter', async ({ client, assert }) => {
    const { event } = await acceptedRequestEvent()
    await OutboundWebhookEvent.query().where('id', event.id).update({
      state: 'delivered',
      updated_at: DateTime.now().minus({ days: 3 }).toSQL(),
    })

    const response = await client
      .get('/api/v1/webhook-events')
      .qs({ since: DateTime.now().minus({ hours: 1 }).toISO() })
      .headers(SERVICE_HEADERS)

    assert.isFalse(response.body().events.some((e: { event_id: string }) => e.event_id === event.publicId))
  })

  test('rejects an invalid since parameter', async ({ client }) => {
    const response = await client.get('/api/v1/webhook-events').qs({ since: 'not-a-date' }).headers(SERVICE_HEADERS)

    response.assertStatus(422)
  })
})
