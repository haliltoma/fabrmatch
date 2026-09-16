import MatchOffer from '#models/match_offer'
import ProductionRequest from '#models/production_request'
import { expireStaleOffers, retryUnmatchedRequests } from '#services/matching/sweep'
import { intakeProductionRequest } from '#services/production_request_intake'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createManufacturer, productionRequestBody } from '#tests/helpers'

test.group('Matching sweep · expired offers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('releases an unanswered offer and re-offers to a different manufacturer', async ({ assert }) => {
    const first = await createManufacturer({ city: 'Mersin' })
    const second = await createManufacturer({ city: 'Adana' })
    const { request } = await intakeProductionRequest({
      ...productionRequestBody(),
      requested_delivery_by: DateTime.fromISO('2099-01-01'),
    })
    const originalOffer = await MatchOffer.query().where('production_request_id', request.id).firstOrFail()
    const wonByFirst = originalOffer.manufacturerId === first.id

    await MatchOffer.query().where('id', originalOffer.id).update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL() })

    const touched = await expireStaleOffers()

    assert.deepEqual(touched, [request.id])
    await originalOffer.refresh()
    assert.equal(originalOffer.status, 'expired')

    await request.refresh()
    assert.equal(request.status, 'awaiting_acceptance')
    // Süresi dolan teklifin sahibi bir sonraki denemede hariç tutulur
    assert.equal(request.manufacturerId, wonByFirst ? second.id : first.id)

    const offers = await MatchOffer.query().where('production_request_id', request.id).orderBy('id')
    assert.lengthOf(offers, 2)
    assert.equal(offers[1].status, 'offered')
  })

  test('a request with only one unresponsive manufacturer stays in matching', async ({ assert }) => {
    await createManufacturer()
    const { request } = await intakeProductionRequest({
      ...productionRequestBody(),
      requested_delivery_by: DateTime.fromISO('2099-01-01'),
    })
    const offer = await MatchOffer.query().where('production_request_id', request.id).firstOrFail()
    await MatchOffer.query().where('id', offer.id).update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL() })

    await expireStaleOffers()

    await request.refresh()
    assert.equal(request.status, 'matching_in_progress')
    assert.isNull(request.manufacturerId)
  })

  test('leaves offers that have not expired yet untouched', async ({ assert }) => {
    await createManufacturer()
    const { request } = await intakeProductionRequest({
      ...productionRequestBody(),
      requested_delivery_by: DateTime.fromISO('2099-01-01'),
    })

    const touched = await expireStaleOffers()

    assert.deepEqual(touched, [])
    await request.refresh()
    assert.equal(request.status, 'awaiting_acceptance')
  })
})

test.group('Matching sweep · unmatched requests', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('leaves a freshly failed match alone until it goes stale', async ({ assert }) => {
    await createManufacturer({ materials: ['TPU'] }) // 03-PRD-URETICI-AGI'daki PLA talebiyle uyuşmuyor
    const { request } = await intakeProductionRequest({
      ...productionRequestBody(),
      requested_delivery_by: DateTime.fromISO('2099-01-01'),
    })
    await request.refresh()
    assert.equal(request.status, 'matching_in_progress')
    assert.equal(request.matchAttempts, 1)

    // Az önce başarısız oldu (updated_at yeni) — 5 dakikalık eşiği henüz geçmedi
    const tooSoon = await retryUnmatchedRequests()
    assert.deepEqual(tooSoon, [])
  })

  test('retries a stale unmatched request and succeeds once a compatible manufacturer exists', async ({
    assert,
  }) => {
    await createManufacturer({ materials: ['TPU'] })
    const { request } = await intakeProductionRequest({
      ...productionRequestBody(),
      requested_delivery_by: DateTime.fromISO('2099-01-01'),
    })

    const backdate = () =>
      ProductionRequest.query()
        .where('id', request.id)
        .update({ updated_at: DateTime.now().minus({ minutes: 10 }).toSQL() })

    // Hâlâ uyumlu üretici yok: talep denenir ama yine eşleşmeden kalır
    await backdate()
    const firstRetry = await retryUnmatchedRequests()
    assert.deepEqual(firstRetry, [request.id])
    await request.refresh()
    assert.equal(request.status, 'matching_in_progress')
    assert.equal(request.matchAttempts, 2)

    // Şimdi uyumlu bir üretici var; bir sonraki taramada eşleşmeli
    const manufacturer = await createManufacturer({ materials: ['PLA', 'PETG'] })
    await backdate()
    const secondRetry = await retryUnmatchedRequests()

    assert.deepEqual(secondRetry, [request.id])
    await request.refresh()
    assert.equal(request.status, 'awaiting_acceptance')
    assert.equal(request.manufacturerId, manufacturer.id)
    assert.equal(request.matchAttempts, 3)
  })

  test('does not touch requests that were already matched', async ({ assert }) => {
    await createManufacturer()
    const { request } = await intakeProductionRequest({
      ...productionRequestBody(),
      requested_delivery_by: DateTime.fromISO('2099-01-01'),
    })
    await ProductionRequest.query()
      .where('id', request.id)
      .update({ updated_at: DateTime.now().minus({ minutes: 10 }).toSQL() })

    const retried = await retryUnmatchedRequests()

    assert.deepEqual(retried, [])
  })
})
