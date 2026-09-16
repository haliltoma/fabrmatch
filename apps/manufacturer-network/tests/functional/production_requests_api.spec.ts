import MatchOffer from '#models/match_offer'
import ProductionRequest from '#models/production_request'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { createManufacturer, productionRequestBody, SERVICE_HEADERS } from '#tests/helpers'

const withKey = (lineItemRef = 'ordli_01TEST') => ({ ...SERVICE_HEADERS, 'idempotency-key': lineItemRef })

test.group('API v1 · production requests', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('rejects calls without a valid service key', async ({ client }) => {
    const response = await client
      .post('/api/v1/production-requests')
      .headers({ accept: 'application/json', authorization: 'Bearer wrong' })
      .json(productionRequestBody())

    response.assertStatus(401)
  })

  test('validates the contract payload', async ({ client }) => {
    const response = await client
      .post('/api/v1/production-requests')
      .headers(withKey())
      .json(productionRequestBody({ quantity: 0, buyer_region: { country: 'TUR', city: null } }))

    response.assertStatus(422)
  })

  test('requires Idempotency-Key to equal the line item ref', async ({ client }) => {
    const response = await client
      .post('/api/v1/production-requests')
      .headers(withKey('something-else'))
      .json(productionRequestBody())

    response.assertStatus(422)
  })

  test('creates a request and offers it to an eligible manufacturer', async ({ client, assert }) => {
    const manufacturer = await createManufacturer()

    const response = await client.post('/api/v1/production-requests').headers(withKey()).json(productionRequestBody())

    response.assertStatus(201)
    const request = await ProductionRequest.query()
      .where('public_id', response.body().production_request_id)
      .firstOrFail()
    assert.equal(request.status, 'awaiting_acceptance')
    assert.equal(request.manufacturerId, manufacturer.id)
    // 2 × (52 g × 0.9 + 95/60 sa × 20)
    assert.equal(request.manufacturerPayout, 156.93)
    assert.deepEqual(request.printEstimate?.part_weight_g, 48)

    const offer = await MatchOffer.query().where('production_request_id', request.id).firstOrFail()
    assert.equal(offer.status, 'offered')
    assert.equal(offer.selectionReason, 'score')
  })

  test('is idempotent per line item', async ({ client, assert }) => {
    const first = await client.post('/api/v1/production-requests').headers(withKey()).json(productionRequestBody())
    const second = await client.post('/api/v1/production-requests').headers(withKey()).json(productionRequestBody())

    first.assertStatus(201)
    second.assertStatus(200)
    assert.equal(second.body().production_request_id, first.body().production_request_id)
    const count = await ProductionRequest.query().where('sistem_a_line_item_ref', 'ordli_01TEST').count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('stays in matching when no manufacturer is eligible', async ({ client, assert }) => {
    await createManufacturer({ materials: ['TPU'] })

    const response = await client.post('/api/v1/production-requests').headers(withKey()).json(productionRequestBody())

    response.assertStatus(201)
    response.assertBodyContains({ status: 'matching_in_progress' })
    const request = await ProductionRequest.query().where('sistem_a_line_item_ref', 'ordli_01TEST').firstOrFail()
    assert.equal(request.matchAttempts, 1)
  })
})

test.group('API v1 · region capability', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('summarises active manufacturers in a region', async ({ client }) => {
    await createManufacturer({ materials: ['PLA', 'PETG'] })
    await createManufacturer({ materials: ['ASA'], city: 'İstanbul' })
    await createManufacturer({ materials: ['TPU'], status: 'suspended' })

    const response = await client.get('/api/v1/region-capability').qs({ region: 'TR-Mersin' }).headers(SERVICE_HEADERS)

    response.assertStatus(200)
    response.assertBody({
      region: 'TR-Mersin',
      supported_materials: ['PETG', 'PLA'],
      avg_turnaround_days: null,
      manufacturer_count: 1,
    })
  })
})
