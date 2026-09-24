/* eslint-disable @unicorn/no-await-expression-member -- terse status assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import WebhookDelivery from '#models/webhook_delivery'
import WebhookEndpoint from '#models/webhook_endpoint'
import EncryptionService from '#services/identity/encryption_service'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import WebhookService, {
  DISABLE_AFTER_FAILURES,
  MAX_ATTEMPTS,
  MAX_ENDPOINTS,
  WebhookError,
  signPayload,
  verifySignature,
} from '#services/integrations/webhook_service'
import type { WebhookRequest } from '#services/integrations/webhook_transport'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

const HOOK = 'https://hooks.example.com/fabrmatch'

function recorder(status = 200) {
  const calls: WebhookRequest[] = []
  return {
    calls,
    transport: async (req: WebhookRequest) => {
      calls.push(req)
      return { status }
    },
  }
}

async function makeDue() {
  await WebhookDelivery.query()
    .where('status', 'pending')
    .update({ nextAttemptAt: DateTime.now().minus({ seconds: 1 }).toSQL()! })
}

async function draftSale(shop: Awaited<ReturnType<typeof createStorefrontProduct>>) {
  const buyer = await createUser('buyer')
  return new OrderService().createStorefrontDraft(buyer, shop.product.id, {
    material: 'PLA',
    quantity: 1,
    shippingAddress: TR_ADDRESS,
  })
}

test.group('webhook signatures', () => {
  test('a signature verifies, and breaks on a changed body, secret or old timestamp', ({
    assert,
  }) => {
    const header = signPayload('whsec_a', 1_700_000_000, '{"a":1}')
    const now = 1_700_000_100
    assert.isTrue(verifySignature('whsec_a', header, '{"a":1}', 300, now))
    assert.isFalse(verifySignature('whsec_a', header, '{"a":2}', 300, now))
    assert.isFalse(verifySignature('whsec_b', header, '{"a":1}', 300, now))
    assert.isFalse(verifySignature('whsec_a', header, '{"a":1}', 300, now + 1000))
    assert.isFalse(verifySignature('whsec_a', 'garbage', '{"a":1}', 300, now))
  })
})

test.group('webhook endpoints', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the secret is returned once and stored encrypted', async ({ assert }) => {
    const user = await createUser('seller')
    const { endpoint, secret } = await new WebhookService().createEndpoint(user.id, HOOK)
    assert.match(secret, /^whsec_[0-9a-f]{48}$/)
    assert.notInclude(endpoint.secretEnc, secret)
    assert.equal(new EncryptionService().decrypt(endpoint.secretEnc), secret)
  })

  test('unsafe URLs are refused and the number of endpoints is capped', async ({ assert }) => {
    const user = await createUser('seller')
    const service = new WebhookService()
    await assert.rejects(() => service.createEndpoint(user.id, 'https://127.0.0.1/hook'))
    await assert.rejects(() => service.createEndpoint(user.id, 'https://localhost/hook'))
    for (let i = 0; i < MAX_ENDPOINTS; i++) {
      await service.createEndpoint(user.id, `${HOOK}/${i}`)
    }
    await assert.rejects(() => service.createEndpoint(user.id, `${HOOK}/extra`), WebhookError)
  })

  test('one seller cannot touch another seller’s endpoint', async ({ assert }) => {
    const owner = await createUser('seller')
    const other = await createUser('seller')
    const service = new WebhookService()
    const { endpoint } = await service.createEndpoint(owner.id, HOOK)
    await assert.rejects(() => service.deleteEndpoint(other.id, endpoint.id), WebhookError)
    await assert.rejects(() => service.setActive(other.id, endpoint.id, false), WebhookError)
    await assert.rejects(() => service.sendTest(other.id, endpoint.id), WebhookError)
    assert.isNotNull(await WebhookEndpoint.find(endpoint.id))
  })
})

test.group('order events', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a status change queues one identity-free event for the seller’s active endpoints only', async ({
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const service = new WebhookService()
    const { endpoint } = await service.createEndpoint(shop.sellerUser.id, HOOK)
    const { endpoint: off } = await service.createEndpoint(shop.sellerUser.id, `${HOOK}/off`)
    await service.setActive(shop.sellerUser.id, off.id, false)
    const stranger = await createUser('seller')
    await service.createEndpoint(stranger.id, `${HOOK}/stranger`)

    const order = await draftSale(shop)
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')

    const rows = await WebhookDelivery.query().orderBy('id', 'asc')
    assert.deepEqual(
      rows.map((r) => [r.endpointId, r.eventType, r.status]),
      [
        [endpoint.id, 'order.status_changed', 'pending'],
        [endpoint.id, 'order.status_changed', 'pending'],
      ]
    )
    const paid = rows[1].payload
    assert.equal(paid.data.previousStatus, 'awaiting_payment')
    assert.equal(paid.data.order.status, 'paid')
    assert.equal(paid.data.order.code, order.code)
    assert.match(paid.id, /^evt_[0-9a-f]{24}$/)

    const text = JSON.stringify(rows.map((r) => r.payload)).toLowerCase()
    for (const forbidden of [
      'buyer',
      'maker',
      'manufacturer',
      '@test.com',
      'ali veli',
      'shipping',
    ]) {
      assert.notInclude(text, forbidden)
    }
  })

  test('orders without a seller queue nothing', async ({ assert }) => {
    const shop = await createStorefrontProduct()
    await new WebhookService().createEndpoint(shop.sellerUser.id, HOOK)
    const { createDraftOrder } = await import('#tests/helpers/order_fixtures')
    const { order } = await createDraftOrder()
    await new OrderStateMachine().transition(order.id, 'awaiting_payment')
    assert.lengthOf(await WebhookDelivery.all(), 0)
  })

  test('the event rolls back together with a failed status change', async ({ assert }) => {
    const shop = await createStorefrontProduct()
    await new WebhookService().createEndpoint(shop.sellerUser.id, HOOK)
    const order = await draftSale(shop)

    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await new OrderStateMachine().transition(order.id, 'awaiting_payment', { trx })
        throw new Error('later step failed')
      })
    })
    assert.lengthOf(await WebhookDelivery.all(), 0)
  })
})

test.group('delivery', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function setup() {
    const shop = await createStorefrontProduct()
    const service = (transport: (r: WebhookRequest) => Promise<{ status: number }>) =>
      new WebhookService(transport)
    const { endpoint, secret } = await service(async () => ({ status: 200 })).createEndpoint(
      shop.sellerUser.id,
      HOOK
    )
    const order = await draftSale(shop)
    await new OrderStateMachine().transition(order.id, 'awaiting_payment')
    return { shop, endpoint, secret, service }
  }

  test('a 2xx answer marks it delivered, with headers and a signature that verifies', async ({
    assert,
  }) => {
    const { endpoint, secret, service } = await setup()
    const rec = recorder(204)
    const result = await service(rec.transport).deliverDue()
    assert.deepEqual(result, { delivered: 1, failed: 0, retried: 0 })

    const [call] = rec.calls
    assert.equal(call.url, endpoint.url)
    assert.equal(call.headers['fabrmatch-event-type'], 'order.status_changed')
    assert.equal(call.headers['fabrmatch-delivery-attempt'], '1')
    assert.isTrue(verifySignature(secret, call.headers['fabrmatch-signature'], call.body))
    assert.equal(JSON.parse(call.body).id, call.headers['fabrmatch-event-id'])

    const row = await WebhookDelivery.firstOrFail()
    assert.equal(row.status, 'delivered')
    assert.isNotNull(row.deliveredAt)
  })

  test('nothing is sent twice: delivered rows and freshly leased rows are skipped', async ({
    assert,
  }) => {
    const { service } = await setup()
    const rec = recorder(500)
    await service(rec.transport).deliverDue()
    await service(rec.transport).deliverDue() // backoff not over yet
    assert.lengthOf(rec.calls, 1)

    await makeDue()
    const ok = recorder(200)
    await service(ok.transport).deliverDue()
    await service(ok.transport).deliverDue()
    assert.lengthOf(ok.calls, 1)
  })

  test('failures back off, count attempts and end as failed after the last one', async ({
    assert,
  }) => {
    const { endpoint, service } = await setup()
    const rec = recorder(500)
    const first = await service(rec.transport).deliverDue()
    assert.deepEqual(first, { delivered: 0, failed: 0, retried: 1 })
    let row = await WebhookDelivery.firstOrFail()
    assert.equal(row.attempts, 1)
    assert.equal(row.lastStatusCode, 500)
    assert.equal(row.status, 'pending')
    assert.isAbove(row.nextAttemptAt.toMillis(), DateTime.now().plus({ seconds: 30 }).toMillis())

    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await makeDue()
      await service(rec.transport).deliverDue()
    }
    row = await WebhookDelivery.firstOrFail()
    assert.equal(row.status, 'failed')
    assert.equal(row.attempts, MAX_ATTEMPTS)
    assert.lengthOf(rec.calls, MAX_ATTEMPTS)
    assert.isBelow(MAX_ATTEMPTS, DISABLE_AFTER_FAILURES)
    assert.isTrue((await WebhookEndpoint.findOrFail(endpoint.id)).isActive)
  })

  test('a thrown transport error is a failure, and a later success clears the streak', async ({
    assert,
  }) => {
    const { endpoint, service } = await setup()
    await service(async () => {
      throw new Error('connect ECONNREFUSED')
    }).deliverDue()
    let row = await WebhookDelivery.firstOrFail()
    assert.include(row.lastError ?? '', 'ECONNREFUSED')
    assert.isNull(row.lastStatusCode)
    assert.equal((await WebhookEndpoint.findOrFail(endpoint.id)).consecutiveFailures, 1)

    await makeDue()
    await service(recorder(200).transport).deliverDue()
    row = await WebhookDelivery.firstOrFail()
    assert.equal(row.status, 'delivered')
    assert.equal((await WebhookEndpoint.findOrFail(endpoint.id)).consecutiveFailures, 0)
  })

  test('an endpoint that keeps failing is turned off and its queue is dropped', async ({
    assert,
  }) => {
    const { shop, endpoint, service } = await setup()
    await WebhookEndpoint.query()
      .where('id', endpoint.id)
      .update({ consecutiveFailures: DISABLE_AFTER_FAILURES - 1 })
    await service(recorder(500).transport).deliverDue()
    const reloaded = await WebhookEndpoint.findOrFail(endpoint.id)
    assert.isFalse(reloaded.isActive)
    assert.include(reloaded.disabledReason ?? '', 'repeated failures')

    await makeDue()
    const rec = recorder(200)
    await service(rec.transport).deliverDue()
    assert.lengthOf(rec.calls, 0) // nothing more is sent to a switched-off endpoint
    assert.equal((await WebhookDelivery.firstOrFail()).status, 'failed')

    const order = await draftSale(shop)
    await new OrderStateMachine().transition(order.id, 'awaiting_payment')
    assert.lengthOf(await WebhookDelivery.all(), 1) // no new event for a switched-off endpoint
  })

  test('the test button queues a webhook.test event that is delivered like any other', async ({
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const rec = recorder(200)
    const service = new WebhookService(rec.transport)
    const { endpoint } = await service.createEndpoint(shop.sellerUser.id, HOOK)
    await service.sendTest(shop.sellerUser.id, endpoint.id)
    await service.deliverDue()
    assert.equal(rec.calls[0].headers['fabrmatch-event-type'], 'webhook.test')
  })

  test('old finished deliveries are pruned, pending ones never', async ({ assert }) => {
    const { endpoint, service } = await setup()
    await WebhookDelivery.create({
      endpointId: endpoint.id,
      eventId: 'evt_old',
      eventType: 'webhook.test',
      payload: {},
      status: 'delivered',
      attempts: 1,
      nextAttemptAt: DateTime.now(),
    })
    await WebhookDelivery.query()
      .where('eventId', 'evt_old')
      .update({ createdAt: DateTime.now().minus({ days: 40 }).toSQL()! })
    await WebhookDelivery.query()
      .where('status', 'pending')
      .update({
        createdAt: DateTime.now().minus({ days: 40 }).toSQL()!,
        nextAttemptAt: DateTime.now().plus({ days: 1 }).toSQL()!,
      })
    await service(recorder(200).transport).deliverDue()
    const left = await WebhookDelivery.all()
    assert.deepEqual(
      left.map((r) => r.status),
      ['pending']
    )
  })
})
