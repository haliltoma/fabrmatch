import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import FinancialReportService, { monthPeriod } from '#services/reports/financial_report_service'

export const statementMonthValidator = vine.create({
  month: vine
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
})

/** A member's own payout statement for a month as a CSV download. */
export async function sendStatement(
  response: HttpContext['response'],
  month: string | undefined,
  scope: { type: 'manufacturer' | 'seller'; beneficiaryId: string }
) {
  const base = month ? DateTime.fromFormat(month, 'yyyy-MM') : DateTime.now()
  const period = monthPeriod(base.year, base.month)
  const body = await new FinancialReportService().payoutsCsv(period, scope)
  return response
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', `attachment; filename="fabrmatch-payouts-${period.label}.csv"`)
    .send(body)
}
