import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import Payout from '#models/payout'
import PayoutDocument from '#models/payout_document'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PayoutService from '#services/payments/payout_service'
import PayoutDocumentService from '#services/payments/payee/payout_document_service'
import { minorToDecimal } from '#services/reports/csv'
import { monthPeriod } from '#services/reports/financial_report_service'
import TaxReportService from '#services/reports/tax_report_service'
import { approvePayee, createFundedOrder, createUser } from '#tests/helpers/order_fixtures'

const now = DateTime.now()
const period = monthPeriod(now.year, now.month)
const ledger = new LedgerService()

test.group('Tax reports (R7-T7)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('the monthly VAT and withholding figures are exactly the ledger', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const payouts = new PayoutService(provider, 'merchant_of_record')

    // a VAT-registered maker with a seller, and a home producer
    const seller = await createUser('seller')
    const a = await createFundedOrder(provider, { seller })
    await approvePayee('manufacturer', a.profile.id, a.makerUser.id, 'company')
    await approvePayee('seller', seller.id, seller.id, 'sole_proprietor')
    const b = await createFundedOrder(provider)
    await approvePayee('manufacturer', b.profile.id, b.makerUser.id, 'home_exempt')
    await payouts.release(a.order.id)
    await payouts.release(b.order.id)

    // the maker invoices and an admin approves it; the seller has not invoiced yet
    const makerPayout = await Payout.query()
      .where('orderId', a.order.id)
      .where('beneficiaryType', 'manufacturer')
      .firstOrFail()
    const documents = new PayoutDocumentService()
    const invoice = await documents.submitInvoice(
      a.makerUser.id,
      { type: 'manufacturer', id: a.profile.id },
      makerPayout.id,
      {
        number: 'MKR2026000000001',
        issuedOn: now,
        grossMinor: makerPayout.grossMinor!,
        vatMinor: makerPayout.vatMinor,
      },
      Buffer.from('%PDF-1.4')
    )
    const admin = await createUser('admin')
    await documents.reviewInvoice(admin.id, invoice.id, true)

    const reports = new TaxReportService()
    const [row] = await reports.summary(period)
    assert.equal(row.currency, 'TRY')
    assert.equal(row.outputVatMinor, await ledger.balance('vat_payable'))
    assert.equal(row.inputVatMinor, await ledger.balance('vat_receivable'))
    assert.equal(row.withheldMinor, await ledger.balance('withholding_payable'))
    assert.equal(row.netVatMinor, row.outputVatMinor - row.inputVatMinor)
    assert.equal(row.inputVatOnApprovedInvoicesMinor, makerPayout.vatMinor)
    assert.isAbove(row.withheldMinor, 0)

    const vat = reports.vatCsv(period, [row])
    assert.include(vat, minorToDecimal(row.outputVatMinor))

    const voucher = await PayoutDocument.query().where('kind', 'expense_voucher').firstOrFail()
    const withholding = await reports.withholdingCsv(period)
    const lines = withholding.trim().split('\r\n')
    assert.lengthOf(lines, 2)
    assert.include(lines[1], voucher.number)
    assert.include(lines[1], '10000000146')
    assert.include(lines[1], b.order.code)
    assert.include(lines[1], minorToDecimal(voucher.withholdingMinor))
    // the rate is read back from the two rounded amounts: 2 % within a kuruş of rounding
    const cells = lines[1].split(',')
    const [gross, ratePercent, withheld] = cells.slice(-4, -1).map(Number)
    assert.approximately(ratePercent, 2, 0.02)
    assert.approximately(withheld, (gross * 2) / 100, 0.01)

    const purchases = await reports.purchaseInvoicesCsv(period)
    assert.include(purchases, 'MKR2026000000001')
    assert.include(purchases, '1234567890')
    // the seller's invoice is not approved, so it is not in the purchase register
    assert.lengthOf(purchases.trim().split('\r\n'), 2)
  })

  test('another month shows nothing', async ({ assert }) => {
    const previous = now.minus({ months: 1 })
    const reports = new TaxReportService()
    const other = monthPeriod(previous.year, previous.month)
    assert.deepEqual(await reports.summary(other), [])
    const empty = await reports.withholdingCsv(other)
    assert.lengthOf(empty.trim().split('\r\n'), 1)
  })
})
