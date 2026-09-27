import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import FinancialReportService, { monthPeriod } from '#services/reports/financial_report_service'
import TaxReportService from '#services/reports/tax_report_service'

const monthValidator = vine.create({
  month: vine
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
})

const periodFrom = (month: string | undefined) => {
  const base = month ? DateTime.fromFormat(month, 'yyyy-MM') : DateTime.now()
  return monthPeriod(base.year, base.month)
}

export default class AdminReportController {
  async index({ inertia, request }: HttpContext) {
    const { month } = await request.validateUsing(monthValidator)
    const period = periodFrom(month)
    return inertia.render('admin/reports/index', {
      month: period.label,
      rows: await new FinancialReportService().summary(period),
      taxRows: await new TaxReportService().summary(period),
    })
  }

  async download({ request, response, params }: HttpContext) {
    const { month } = await request.validateUsing(monthValidator)
    const period = periodFrom(month)
    const reports = new FinancialReportService()
    let body: string
    switch (params.kind) {
      case 'summary':
        body = reports.summaryCsv(period, await reports.summary(period))
        break
      case 'orders':
        body = await reports.ordersCsv(period)
        break
      case 'payouts':
        body = await reports.payoutsCsv(period, null)
        break
      case 'coupons':
        body = await reports.couponsCsv(period)
        break
      case 'vat': {
        const tax = new TaxReportService()
        body = tax.vatCsv(period, await tax.summary(period))
        break
      }
      case 'withholding':
        body = await new TaxReportService().withholdingCsv(period)
        break
      case 'purchase-invoices':
        body = await new TaxReportService().purchaseInvoicesCsv(period)
        break
      default:
        return response.notFound()
    }
    return response
      .header('content-type', 'text/csv; charset=utf-8')
      .header(
        'content-disposition',
        `attachment; filename="fabrmatch-${params.kind}-${period.label}.csv"`
      )
      .send(body)
  }
}
