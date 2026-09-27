/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import EligibilityService from '#services/matching/eligibility_service'
import { priceOrder, OrderInputError } from '#services/orders/order_pricing'
import {
  createAnalyzedFile,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

test.group('order technology follows the material (review fix 4)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('without a print profile, resin is SLA and nylon is SLS, not FDM', async ({ assert }) => {
    const file = await createAnalyzedFile(await createUser('buyer'), 20_000)
    const price = (material: string) =>
      priceOrder({ country: 'TR', hasSeller: false, items: [{ file, material, quantity: 1 }] })
    assert.equal((await price('RESIN')).technology, 'SLA')
    assert.equal((await price('NYLON')).technology, 'SLS')
    assert.equal((await price('PLA')).technology, 'FDM')
  })

  test('one order cannot mix PLA and resin', async ({ assert }) => {
    const file = await createAnalyzedFile(await createUser('buyer'), 20_000)
    await assert.rejects(
      () =>
        priceOrder({
          country: 'TR',
          hasSeller: false,
          items: [
            { file, material: 'PLA', quantity: 1 },
            { file, material: 'RESIN', quantity: 1 },
          ],
        }),
      OrderInputError
    )
  })

  test('a resin order without a profile reaches a resin printer', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile, {
      technology: 'SLA',
      material: 'RESIN',
      build: [200, 125, 210],
    })
    const { order } = await createDraftOrder(undefined, { material: 'RESIN' })
    const candidates = await new EligibilityService().findCandidates(order)
    assert.include(
      candidates.map((c) => c.printerId),
      printer.id
    )
  })
})
