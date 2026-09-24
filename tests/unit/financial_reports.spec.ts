import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import OrderService from '#services/orders/order_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import { csvCell, minorToDecimal, toCsv } from '#services/reports/csv'
import FinancialReportService, { monthPeriod } from '#services/reports/financial_report_service'
import {
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const reports = new FinancialReportService()
const now = DateTime.now()

test.group('csv', () => {
  test('cells are escaped, and formulas are neutralised', ({ assert }) => {
    assert.equal(csvCell('plain'), 'plain')
    assert.equal(csvCell('a,b'), '"a,b"')
    assert.equal(csvCell('say "hi"'), '"say ""hi"""')
    assert.equal(csvCell('two\nlines'), '"two\nlines"')
    for (const attack of ['=HYPERLINK("http://x")', '+1', '-2+3', '@SUM(A1)']) {
      assert.isTrue(csvCell(attack).replace(/^"/, '').startsWith("'"), attack)
    }
    assert.equal(csvCell(-5), '-5') // a real negative number is left alone
    assert.equal(csvCell(null), '')
    assert.equal(toCsv(['a', 'b'], [[1, 'x,y']]), 'a,b\r\n1,"x,y"\r\n')
  })

  test('minor units become exact decimals', ({ assert }) => {
    assert.equal(minorToDecimal(0), '0.00')
    assert.equal(minorToDecimal(5), '0.05')
    assert.equal(minorToDecimal(12345), '123.45')
    assert.equal(minorToDecimal(-250), '-2.50')
  })
})

test.group('financial reports', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  const thisMonth = () => monthPeriod(now.year, now.month)

  test('an empty month has no rows', async ({ assert }) => {
    assert.deepEqual(await reports.summary(monthPeriod(2020, 1)), [])
    assert.throws(() => monthPeriod(2020, 13))
  })

  test('the summary matches the money that moved', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order } = await createFundedOrder(provider, { upTo: 'completed', seller })
    await new PayoutService(provider).release(order.id)

    const [row] = await reports.summary(thisMonth())
    assert.equal(row.currency, 'TRY')
    assert.equal(row.ordersCompleted, 1)
    assert.equal(row.grossMinor, order.totalMinor)
    assert.equal(row.vatMinor, order.taxMinor)
    assert.equal(row.discountMinor, 0)
    assert.equal(row.platformFeeMinor, order.platformFeeMinor)
    assert.equal(row.sellerPayoutsMinor, order.sellerShareMinor)
    assert.equal(
      row.makerPayoutsMinor,
      order.totalMinor - order.platformFeeMinor - order.sellerShareMinor
    )
    // everything the buyer paid is accounted for: fee + seller + maker
    assert.equal(
      row.platformFeeMinor + row.sellerPayoutsMinor + row.makerPayoutsMinor,
      row.grossMinor
    )
    assert.equal(row.refundedMinor, 0)
  })

  test('another month does not see it; a refund shows up in its own line', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const funded = await createFundedOrder(provider, { upTo: 'paid' })
    await new OrderService(new PaymentService(provider, async () => {})).cancelByBuyer(
      funded.order.id,
      funded.buyer.id
    )
    const [row] = await reports.summary(thisMonth())
    assert.equal(row.refundedMinor, funded.order.totalMinor)
    assert.equal(row.ordersCompleted, 0)
    assert.deepEqual(await reports.summary(monthPeriod(now.year - 1, now.month)), [])
  })

  test('amounts in different currencies stay on separate lines', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const a = await createFundedOrder(provider, { upTo: 'completed' })
    const b = await createFundedOrder(provider, { upTo: 'completed' })
    await db.from('orders').where('id', b.order.id).update({ currency: 'USD' })
    const rows = await reports.summary(thisMonth())
    assert.deepEqual(
      rows.map((r) => r.currency),
      ['TRY', 'USD']
    )
    assert.equal(rows[0].grossMinor, a.order.totalMinor)
    assert.equal(rows[1].grossMinor, b.order.totalMinor)
  })

  test('the summary and order exports are plain decimals with no personal data', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'completed', seller })
    await new PayoutService(provider).release(order.id)

    const period = thisMonth()
    const summary = reports.summaryCsv(period, await reports.summary(period))
    const [header, line] = summary.trim().split('\r\n')
    assert.include(header, 'platform_fee_earned')
    assert.include(line, minorToDecimal(order.totalMinor))

    const ordersCsv = await reports.ordersCsv(period)
    assert.include(ordersCsv, order.code)
    for (const forbidden of [buyer.email, buyer.fullName ?? '@@', 'Ali Veli', 'Test Sk']) {
      assert.notInclude(ordersCsv, forbidden)
    }
  })

  test('payout exports: admin sees every beneficiary, a member only their own', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const first = await createFundedOrder(provider, { upTo: 'completed', seller })
    const second = await createFundedOrder(provider, { upTo: 'completed' })
    const payouts = new PayoutService(provider)
    await payouts.release(first.order.id)
    await payouts.release(second.order.id)

    const period = thisMonth()
    const all = await reports.payoutsCsv(period, null)
    assert.include(all, first.order.code)
    assert.include(all, second.order.code)
    assert.include(all, 'beneficiary_type')

    const mine = await reports.payoutsCsv(period, {
      type: 'manufacturer',
      beneficiaryId: first.profile.id,
    })
    assert.include(mine, first.order.code)
    assert.notInclude(mine, second.order.code)
    assert.notInclude(mine, 'beneficiary')

    const sellerOwn = await reports.payoutsCsv(period, { type: 'seller', beneficiaryId: seller.id })
    assert.include(sellerOwn, first.order.code)
    assert.notInclude(sellerOwn, second.order.code)
  })
})
