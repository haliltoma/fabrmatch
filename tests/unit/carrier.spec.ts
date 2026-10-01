import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import ProductionJob from '#models/production_job'
import { InvalidCarrierSignatureError } from '#services/shipping/carrier_provider'
import CarrierService from '#services/shipping/carrier_service'
import FakeCarrier from '#services/shipping/fake_carrier'
import FakePaymentProvider from '#services/payments/fake_provider'
import { createFundedOrder, orderStatus } from '#tests/helpers/order_fixtures'
import env from '#start/env'
import { Secret } from '@adonisjs/core/helpers'

async function shippedOrder() {
  const funded = await createFundedOrder(new FakePaymentProvider(), { upTo: 'shipped' })
  const job = await ProductionJob.query().where('orderId', funded.order.id).firstOrFail()
  job.trackingNumber = 'TRK123456'
  await job.save()
  return { ...funded, job }
}

test.group('carrier integration (R2-T8, fake)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a signed delivered event delivers a shipped order once; redelivery is a no-op', async ({
    assert,
  }) => {
    const carrier = new FakeCarrier()
    const service = new CarrierService(carrier)
    const { order } = await shippedOrder()

    const evt = carrier.signedEvent({ trackingNumber: 'TRK123456', status: 'delivered' })
    assert.equal(await service.handleWebhook(evt.body, evt.headers), 'delivered')
    assert.equal(await orderStatus(order.id), 'delivered')
    assert.equal(await service.handleWebhook(evt.body, evt.headers), 'duplicate')

    const other = carrier.signedEvent({ trackingNumber: 'TRK123456', status: 'delivered' })
    assert.equal(
      await service.handleWebhook(other.body, other.headers),
      'ignored',
      'already delivered'
    )
    assert.equal(await orderStatus(order.id), 'delivered')
  })

  test('in-transit events change nothing; unknown parcels are recorded and ignored', async ({
    assert,
  }) => {
    const carrier = new FakeCarrier()
    const service = new CarrierService(carrier)
    const { order } = await shippedOrder()

    const moving = carrier.signedEvent({ trackingNumber: 'TRK123456', status: 'in_transit' })
    assert.equal(await service.handleWebhook(moving.body, moving.headers), 'in_transit')
    assert.equal(await orderStatus(order.id), 'shipped')

    const stray = carrier.signedEvent({ trackingNumber: 'NOPE', status: 'delivered' })
    assert.equal(await service.handleWebhook(stray.body, stray.headers), 'unknown_parcel')
    const rows = await db.from('carrier_events')
    assert.lengthOf(rows, 2)
  })

  test('a forged or tampered event is rejected before anything is stored', async ({ assert }) => {
    const service = new CarrierService(new FakeCarrier('real-secret'))
    const forged = new FakeCarrier('attacker-secret').signedEvent({
      trackingNumber: 'TRK123456',
      status: 'delivered',
    })
    await assert.rejects(
      () => service.handleWebhook(forged.body, forged.headers),
      InvalidCarrierSignatureError
    )
    await assert.rejects(() => service.handleWebhook(forged.body, {}), InvalidCarrierSignatureError)
    assert.lengthOf(await db.from('carrier_events'), 0)
  })

  test('with FAKE_CARRIER_SECRET set, the public test constant no longer signs', async ({
    assert,
    cleanup,
  }) => {
    env.set('FAKE_CARRIER_SECRET', new Secret('staging-only-secret') as never)
    cleanup(() => {
      // env.set(key, undefined) would leave the string "undefined" in process.env
      env.set('FAKE_CARRIER_SECRET', undefined as never)
      delete process.env.FAKE_CARRIER_SECRET
    })
    await shippedOrder()
    const service = new CarrierService()
    const event = { trackingNumber: 'TRK123456', status: 'delivered' as const }
    const forged = new FakeCarrier().signedEvent(event)
    await assert.rejects(
      () => service.handleWebhook(forged.body, forged.headers),
      InvalidCarrierSignatureError
    )
    const genuine = new FakeCarrier('staging-only-secret').signedEvent(event)
    assert.equal(await service.handleWebhook(genuine.body, genuine.headers), 'delivered')
  })

  test('the label’s sender never names the maker, only the public alias', async ({ assert }) => {
    const carrier = new FakeCarrier()
    const { job, profile, makerUser } = await shippedOrder()
    const label = await new CarrierService(carrier).createLabel(job.id, 350)
    assert.match(label.trackingNumber, /^FC/)
    const sent = carrier.labels[0]
    assert.include(sent.senderLabel, 'Fabrmatch Fulfillment')
    assert.include(sent.senderLabel, profile.publicAlias)
    assert.notInclude(JSON.stringify(sent), makerUser.email)
    assert.equal(sent.toName, 'Ali Veli')
  })
})
