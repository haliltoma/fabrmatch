import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ProductionJob from '#models/production_job'
import MakerAttentionService from '#services/manufacturing/maker_attention_service'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

async function jobFor(profileId: number, printerId: number, status: string, dueInDays: number) {
  const { product } = await createStorefrontProduct()
  const order = await new OrderService().createStorefrontDraft(
    await createUser('buyer'),
    product.id,
    {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    }
  )
  const sm = new OrderStateMachine()
  for (const to of ['awaiting_payment', 'paid', 'matching'] as const)
    await sm.transition(order.id, to)
  return ProductionJob.create({
    orderId: order.id,
    manufacturerProfileId: profileId,
    printerId,
    status: status as ProductionJob['status'],
    acceptedAt: DateTime.now(),
    dueAt: DateTime.now().plus({ days: dueInDays }),
  })
}

test.group('maker attention', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('nothing waiting: no items, no badge', async ({ assert }) => {
    const maker = await createManufacturer()
    const r = await new MakerAttentionService().forProfile(maker.profile.id)
    assert.deepEqual(r, { badges: { work: 0 }, items: [] })
  })

  test('late jobs come before parts to ship and jobs to start; late ones count on Work', async ({
    assert,
  }) => {
    const maker = await createManufacturer()
    const printer = await createPrinter(maker.profile)
    await jobFor(maker.profile.id, printer.id, 'produced', -1) // late and ready to ship
    await jobFor(maker.profile.id, printer.id, 'accepted', 3) // to start

    const r = await new MakerAttentionService().forProfile(maker.profile.id)
    assert.deepEqual(
      r.items.map((i) => [i.key, i.count]),
      [
        ['overdue', 1],
        ['ship', 1],
        ['start', 1],
      ]
    )
    assert.equal(r.badges.work, 1)
  })
})
