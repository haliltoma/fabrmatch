import Manufacturer from '#models/manufacturer'
import MatchOffer from '#models/match_offer'
import OutboundWebhookEvent from '#models/outbound_webhook_event'
import PayoutInstruction from '#models/payout_instruction'
import { signPayload } from '#services/contract/signature'
import { acceptOffer, advanceProduction, InvalidTransitionException } from '#services/production_lifecycle'
import { intakeProductionRequest } from '#services/production_request_intake'
import { deliverWebhookEvent, dueWebhookEventIds } from '#services/webhook_delivery'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createManufacturer, productionRequestBody } from '#tests/helpers'

type Received = { headers: IncomingHttpHeaders; body: string }

async function startFakeSistemA(status = 200) {
  const received: Received[] = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      received.push({ headers: req.headers, body })
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end('{"received":true}')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { received, baseUrl, close: () => new Promise<void>((resolve) => server.close(() => resolve())) }
}

async function matchedRequest(lineItemRef = 'ordli_01TEST') {
  await createManufacturer()
  const body = productionRequestBody({ sistem_a_line_item_ref: lineItemRef })
  const { request } = await intakeProductionRequest({
    ...body,
    requested_delivery_by: DateTime.fromISO('2099-01-01'),
  })
  const offer = await MatchOffer.query().where('production_request_id', request.id).firstOrFail()
  // Birden çok aday varsa teklif herhangi birine gidebilir (keşif payı) — sahibi tekliften okunur
  const manufacturer = await Manufacturer.findOrFail(offer.manufacturerId)
  return { manufacturer, request, offer }
}

test.group('Production lifecycle · webhooks and payout ledger', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('each step emits a signed webhook in order and delivery creates a payout instruction', async ({
    assert,
    cleanup,
  }) => {
    const sistemA = await startFakeSistemA()
    cleanup(() => sistemA.close())
    const { manufacturer, request, offer } = await matchedRequest()

    await acceptOffer(manufacturer.id, offer.id)
    await advanceProduction(manufacturer.id, request.id, { status: 'in_production' })
    await advanceProduction(manufacturer.id, request.id, {
      status: 'quality_check',
      photos: ['https://cdn.fabrmatch.test/qc-1.jpg'],
    })
    await advanceProduction(manufacturer.id, request.id, { status: 'shipped', trackingNumber: 'TRK-1' })
    await advanceProduction(manufacturer.id, request.id, { status: 'delivered' })

    // .env.test'teki SISTEM_A_URL erişilemez: kuyruktaki ilk deneme başarısız, 1 dk sonrasına planlandı
    const pending = await OutboundWebhookEvent.query().where('production_request_id', request.id).orderBy('id')
    assert.deepEqual(
      pending.map((event) => event.status),
      ['accepted', 'in_production', 'quality_check', 'shipped', 'delivered']
    )
    assert.equal(pending[0].attempts, 1)
    assert.equal(pending[0].state, 'pending')
    assert.isTrue(pending[0].nextAttemptAt! > DateTime.now())

    for (const event of pending) {
      assert.equal(await deliverWebhookEvent(event.id, { baseUrl: sistemA.baseUrl }), 'delivered')
    }

    assert.lengthOf(sistemA.received, 5)
    for (const call of sistemA.received) {
      const timestamp = String(call.headers['x-fabrmatch-timestamp'])
      assert.equal(call.headers['x-fabrmatch-signature'], signPayload('test-webhook-secret', timestamp, call.body))
    }

    const bodies = sistemA.received.map((call) => JSON.parse(call.body))
    assert.deepEqual(bodies[2].production_photos, ['https://cdn.fabrmatch.test/qc-1.jpg'])
    assert.equal(bodies[3].tracking_number, 'TRK-1')
    assert.isNull(bodies[3].payout_instruction)
    assert.deepInclude(bodies[4].payout_instruction, { amount: 156.93, currency_code: 'try' })
    assert.deepEqual(bodies[4].payout_instruction.manufacturer_account, {
      provider: 'stripe',
      account_id: manufacturer.stripeAccountId,
    })
    assert.equal(bodies[4].production_request_id, request.publicId)
    assert.equal(bodies[4].sistem_a_line_item_ref, 'ordli_01TEST')

    const instruction = await PayoutInstruction.query().where('production_request_id', request.id).firstOrFail()
    assert.equal(instruction.status, 'sent')
    assert.equal(instruction.publicId, bodies[4].payout_instruction.instruction_id)

    const refreshed = await Manufacturer.findOrFail(manufacturer.id)
    assert.equal(refreshed.completedOrders, 1)
    assert.equal(refreshed.onTimeRate, 1)
  })

  test('steps cannot be skipped', async ({ assert }) => {
    const { manufacturer, request, offer } = await matchedRequest()
    await acceptOffer(manufacturer.id, offer.id)

    await assert.rejects(
      () => advanceProduction(manufacturer.id, request.id, { status: 'shipped', trackingNumber: 'TRK-1' }),
      InvalidTransitionException
    )
  })

  test('another manufacturer cannot act on the request', async ({ assert }) => {
    const { request, offer } = await matchedRequest()
    const intruder = await createManufacturer({ city: 'Adana' })

    await assert.rejects(() => acceptOffer(intruder.id, offer.id), InvalidTransitionException)
    await assert.rejects(
      () => advanceProduction(intruder.id, request.id, { status: 'in_production' }),
      InvalidTransitionException
    )
  })

  test('retries follow 1m, 5m, 30m, 2h and then fail; 4xx fails immediately', async ({ assert }) => {
    const { manufacturer, offer } = await matchedRequest()
    const event = await acceptOffer(manufacturer.id, offer.id)
    const start = DateTime.fromISO('2026-09-16T10:00:00Z')
    const refused: typeof fetch = async () => {
      throw new Error('connect ECONNREFUSED')
    }

    await OutboundWebhookEvent.query().where('id', event.id).update({ attempts: 0 })
    const gaps: number[] = []
    for (let attempt = 0; attempt < 5; attempt++) {
      await deliverWebhookEvent(event.id, { fetchImpl: refused, now: () => start })
      const row = await OutboundWebhookEvent.findOrFail(event.id)
      gaps.push(row.nextAttemptAt ? row.nextAttemptAt.diff(start, 'minutes').minutes : -1)
    }
    assert.deepEqual(gaps, [1, 5, 30, 120, -1])
    assert.equal((await OutboundWebhookEvent.findOrFail(event.id)).state, 'failed')

    const sistemA = await startFakeSistemA(404)
    const second = await matchedRequest('ordli_02TEST')
    const secondEvent = await acceptOffer(second.manufacturer.id, second.offer.id)
    assert.equal(await deliverWebhookEvent(secondEvent.id, { baseUrl: sistemA.baseUrl }), 'failed')
    await sistemA.close()

    assert.notInclude(await dueWebhookEventIds(DateTime.now().plus({ days: 1 })), secondEvent.id)
  })
})
