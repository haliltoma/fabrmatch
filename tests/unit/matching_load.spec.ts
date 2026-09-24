import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import EligibilityService from '#services/matching/eligibility_service'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const MAKERS = 150

test.group('matching under load (R5-T7)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test(`ranking ${MAKERS} eligible makers stays fast and does not issue a query per maker`, async ({
    assert,
  }) => {
    for (let i = 0; i < MAKERS; i++) {
      const maker = await createManufacturer({ trustTier: i % 3 })
      await createPrinter(maker.profile)
    }
    const { order } = await createDraftOrder()

    const queries: string[] = []
    const listener = (q: { sql: string }) => queries.push(q.sql)
    db.connection().emitter.on('db:query', listener)
    const started = performance.now()
    const candidates = await new EligibilityService().findCandidates(order)
    const elapsedMs = performance.now() - started
    db.connection().emitter.off('db:query', listener)

    assert.lengthOf(candidates, MAKERS)
    assert.isBelow(elapsedMs, 1500, `took ${Math.round(elapsedMs)} ms`)
    // a fixed handful of queries however many makers there are (no N+1)
    assert.isAbove(queries.length, 0, 'query events are captured')
    assert.isBelow(queries.length, 15, `ran ${queries.length} queries`)
  }).timeout(120_000)
})
