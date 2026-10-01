import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import ProductionJob from '#models/production_job'
import TrustTierService, { computeTier } from '#services/manufacturing/trust_tier_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import Order from '#models/order'
import {
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createUser,
} from '#tests/helpers/order_fixtures'

const stats = (over: Partial<Parameters<typeof computeTier>[0] & object> = {}) => ({
  completed: 0,
  avgRating: null,
  active: 0,
  shipped: 0,
  onTime: 0,
  disputed: 0,
  total: 0,
  ...over,
})

test.group('computeTier (pure rules)', () => {
  test('no history is tier 0', ({ assert }) => {
    assert.equal(computeTier(undefined), 0)
    assert.equal(computeTier(stats()), 0)
  })

  test('tier 1 needs 5 completed jobs and a dispute rate under 5%', ({ assert }) => {
    assert.equal(computeTier(stats({ completed: 4, total: 4 })), 0)
    assert.equal(computeTier(stats({ completed: 5, total: 5 })), 1)
    assert.equal(computeTier(stats({ completed: 5, total: 21, disputed: 1 })), 1)
    assert.equal(
      computeTier(stats({ completed: 5, total: 20, disputed: 1 })),
      0,
      '5% is not under 5%'
    )
    assert.equal(computeTier(stats({ completed: 6, total: 20, disputed: 2 })), 0)
  })

  test('tier 2 needs 25 jobs and a 4.5 rating on top of a clean record', ({ assert }) => {
    assert.equal(computeTier(stats({ completed: 25, total: 25, avgRating: 4.4 })), 1)
    assert.equal(computeTier(stats({ completed: 25, total: 25, avgRating: 4.5 })), 2)
    assert.equal(computeTier(stats({ completed: 25, total: 25, avgRating: null })), 1)
    assert.equal(computeTier(stats({ completed: 30, total: 30, disputed: 5, avgRating: 5 })), 0)
  })
})

async function makerWithDeliveredJobs(count: number, rating = 5) {
  const maker = await createManufacturer()
  await createPrinter(maker.profile)
  const provider = new FakePaymentProvider()
  for (let i = 0; i < count; i++) {
    const { order } = await createFundedOrder(provider, { upTo: 'in_production' })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    job.manufacturerProfileId = maker.profile.id
    job.status = 'delivered'
    job.rating = rating
    job.shippedAt = DateTime.now()
    await job.save()
    await Order.query().where('id', order.id).update({ status: 'delivered' })
  }
  return maker
}

test.group('TrustTierService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the nightly recompute promotes, audits, and is idempotent', async ({ assert }) => {
    const maker = await makerWithDeliveredJobs(5)
    const service = new TrustTierService()

    const first = await service.recomputeAll()
    assert.deepInclude(first, { profileId: maker.profile.id, from: 0, to: 1 })
    const reloaded = await ManufacturerProfile.findOrFail(maker.profile.id)
    assert.equal(reloaded.trustTier, 1)

    const audit = await AuditLog.query()
      .where('action', 'trust_tier.changed')
      .where('subjectId', maker.profile.id)
      .firstOrFail()
    assert.deepInclude(audit.meta, { from: 0, to: 1, by: 'auto', suspicious: false })

    const second = await service.recomputeAll()
    assert.notInclude(
      second.map((c) => c.profileId),
      maker.profile.id
    )
  })

  test('a maker who no longer qualifies is demoted', async ({ assert }) => {
    const maker = await makerWithDeliveredJobs(2)
    await ManufacturerProfile.query().where('id', maker.profile.id).update({ trust_tier: 2 })
    const changes = await new TrustTierService().recomputeAll()
    assert.deepInclude(changes, { profileId: maker.profile.id, from: 2, to: 0 })
    const audit = await AuditLog.query()
      .where('action', 'trust_tier.changed')
      .where('subjectId', maker.profile.id)
      .firstOrFail()
    assert.isTrue(audit.meta.suspicious as boolean)
  })

  test('an admin pin survives the nightly job until unlocked; partner is never auto-changed', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const pinned = await createManufacturer()
    const partner = await createManufacturer({ trustTier: 3 })
    const service = new TrustTierService()

    await service.setByAdmin(pinned.profile.id, 2, admin.id, 'known studio')
    await service.recomputeAll()
    const stillPinned = await ManufacturerProfile.findOrFail(pinned.profile.id)
    assert.equal(stillPinned.trustTier, 2)
    assert.isTrue(stillPinned.trustTierLocked)
    const untouchedPartner = await ManufacturerProfile.findOrFail(partner.profile.id)
    assert.equal(untouchedPartner.trustTier, 3)

    await service.unlock(pinned.profile.id, admin.id)
    const released = await ManufacturerProfile.findOrFail(pinned.profile.id)
    assert.isFalse(released.trustTierLocked)
    assert.equal(released.trustTier, 0, 'no track record → back to the calculated tier')
  })

  test('invalid tiers and unknown makers are rejected', async ({ assert }) => {
    const admin = await createUser('admin')
    const service = new TrustTierService()
    await assert.rejects(() => service.setByAdmin(uid(1), 4, admin.id), /0 to 3/)
    await assert.rejects(() => service.setByAdmin(uid(999999), 1, admin.id), /not found/)
  })
})

import fabrmatchConfig from '#config/fabrmatch'
import { requiredTierForTotal } from '#services/manufacturing/trust_tier_service'
import { createDraftOrder } from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

test.group('order value vs maker tier (X-9)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('bigger orders need a more trusted maker', ({ assert }) => {
    const r = fabrmatchConfig.trust
    assert.equal(requiredTierForTotal(1), 0)
    assert.equal(requiredTierForTotal(r.tier0MaxOrderMinor), 0)
    assert.equal(requiredTierForTotal(r.tier0MaxOrderMinor + 1), 1)
    assert.equal(requiredTierForTotal(r.tier1MaxOrderMinor + 1), 2)
    assert.equal(requiredTierForTotal(r.tier2MaxOrderMinor + 1), 3)
  })

  test('the order records its required tier and eligibility honours it', async ({ assert }) => {
    const small = await createDraftOrder()
    assert.equal(small.order.requiredTrustTier, 0)

    const original = fabrmatchConfig.trust.tier0MaxOrderMinor
    fabrmatchConfig.trust.tier0MaxOrderMinor = 1000
    try {
      const big = await createDraftOrder()
      assert.equal(big.order.requiredTrustTier, 1)
    } finally {
      fabrmatchConfig.trust.tier0MaxOrderMinor = original
    }
  })
})
