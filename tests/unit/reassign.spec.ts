/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import CapacitySlot from '#models/capacity_slot'
import FileAccessGrant from '#models/file_access_grant'
import Order from '#models/order'
import ProductionJob from '#models/production_job'
import MatchingService, { OfferError } from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import FulfillmentService from '#services/orders/fulfillment_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  addQcPhoto,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const noEffects: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

async function inProduction() {
  const maker = await createManufacturer()
  const printer = await createPrinter(maker.profile)
  const { order } = await createDraftOrder()
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  const matching = new MatchingService(noEffects, () => 0.99)
  const offer = await matching.start(order.id)
  const job = await matching.acceptOffer(offer!.id, maker.profile.id)
  return { order, maker, printer, job, matching }
}

const reserved = async (printerId: string) =>
  (await CapacitySlot.query().where('printerId', printerId)).reduce(
    (a, s) => a + s.reservedMinutes,
    0
  )

test.group('reassigning a stuck job (review fix 5)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('accepting records which slot and how many minutes the job holds', async ({ assert }) => {
    const { job, printer } = await inProduction()
    const fresh = await ProductionJob.findOrFail(job.id)
    assert.isNotNull(fresh.capacitySlotId)
    assert.isAbove(fresh.reservedMinutes ?? 0, 0)
    assert.equal(await reserved(printer.id), fresh.reservedMinutes)
  })

  test('an admin moves the order back to matching: job cancelled, files closed, hours freed', async ({
    assert,
  }) => {
    const { order, printer, job, matching, maker } = await inProduction()
    const admin = await createUser('admin')
    // a second maker who can take it over
    const next = await createManufacturer()
    await createPrinter(next.profile)

    await matching.reassign(order.id, admin.id, 'maker stopped answering')

    assert.equal((await Order.findOrFail(order.id)).status, 'matching')
    const old = await ProductionJob.findOrFail(job.id)
    assert.equal(old.status, 'cancelled')
    assert.equal(old.cancelReason, 'admin_reassign')
    const grants = await FileAccessGrant.query().where('productionJobId', job.id)
    assert.isTrue(grants.length > 0)
    assert.isTrue(grants.every((g) => g.expiresAt <= DateTime.now()))
    assert.equal(await reserved(printer.id), 0)
    assert.exists(
      await AuditLog.query()
        .where('action', 'order.reassigned')
        .where('subjectId', order.id)
        .first()
    )

    // the next round skips the maker who dropped it
    const offer = await matching.runRound(order.id)
    assert.exists(offer)
    assert.notEqual(offer!.manufacturerProfileId, maker.profile.id)
  })

  test('a shipped job cannot be reassigned', async ({ assert }) => {
    const { order, job, matching, maker } = await inProduction()
    const svc = new FulfillmentService()
    await svc.markProduced(job.id, maker.profile.id)
    await addQcPhoto(job.id)
    await svc.markShipped(job.id, maker.profile.id, { carrier: 'Yurtici', trackingNumber: 'YT1' })
    const admin = await createUser('admin')
    await assert.rejects(() => matching.reassign(order.id, admin.id, 'too late'), OfferError)
  })
})
