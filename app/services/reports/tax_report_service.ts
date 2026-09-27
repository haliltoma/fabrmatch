import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import EncryptionService from '#services/identity/encryption_service'
import { minorToDecimal, toCsv } from '#services/reports/csv'
import type { Period } from '#services/reports/financial_report_service'

export interface TaxSummaryRow {
  currency: string
  /** VAT owed on sales recognised in the period (sales model B) */
  outputVatMinor: number
  /** VAT booked from payees' invoices when their share was allocated */
  inputVatMinor: number
  /** VAT on the supplier invoices an admin approved in the period (what the accountant deducts) */
  inputVatOnApprovedInvoicesMinor: number
  /** Income tax withheld on expense vouchers issued in the period, owed with the muhtasar */
  withheldMinor: number
  /** output − input from the ledger */
  netVatMinor: number
}

const sql = (d: DateTime) => d.toSQL()!

/** Net movement of a ledger account in the period, per currency, on its normal side. */
async function movement(account: string, debitNormal: boolean, period: Period) {
  const result = await db.rawQuery(
    `select currency,
            coalesce(sum(case when direction = ? then amount_minor else -amount_minor end), 0) as total
       from ledger_entries
      where account = ? and created_at >= ? and created_at < ?
      group by currency`,
    [debitNormal ? 'debit' : 'credit', account, sql(period.from), sql(period.to)]
  )
  return new Map(
    (result.rows as Array<{ currency: string; total: string }>).map((r) => [
      r.currency,
      Number(r.total),
    ])
  )
}

/**
 * Monthly tax figures for the accountant (R7-T7, sales model B): VAT on sales vs. VAT on
 * purchases, and the withholding list for the muhtasar return. Payees' tax numbers appear here
 * because the tax office needs them; the reports are admin-only downloads.
 */
export default class TaxReportService {
  private encryption = new EncryptionService()

  async summary(period: Period): Promise<TaxSummaryRow[]> {
    const output = await movement('vat_payable', false, period)
    const input = await movement('vat_receivable', true, period)
    const withheld = await movement('withholding_payable', false, period)
    const approved = await db
      .from('payout_documents')
      .where('kind', 'supplier_invoice')
      .where('status', 'approved')
      .where('reviewed_at', '>=', sql(period.from))
      .where('reviewed_at', '<', sql(period.to))
      .groupBy('currency')
      .select('currency')
      .sum('vat_minor as vat')
    const approvedVat = new Map(approved.map((r) => [r.currency as string, Number(r.vat)]))

    const currencies = new Set([
      ...output.keys(),
      ...input.keys(),
      ...withheld.keys(),
      ...approvedVat.keys(),
    ])
    return [...currencies].sort().map((currency) => {
      const out = output.get(currency) ?? 0
      const inp = input.get(currency) ?? 0
      return {
        currency,
        outputVatMinor: out,
        inputVatMinor: inp,
        inputVatOnApprovedInvoicesMinor: approvedVat.get(currency) ?? 0,
        withheldMinor: withheld.get(currency) ?? 0,
        netVatMinor: out - inp,
      }
    })
  }

  vatCsv(period: Period, rows: TaxSummaryRow[]): string {
    return toCsv(
      [
        'period',
        'currency',
        'output_vat',
        'input_vat_booked',
        'input_vat_on_approved_invoices',
        'net_vat',
        'income_tax_withheld',
      ],
      rows.map((r) => [
        period.label,
        r.currency,
        minorToDecimal(r.outputVatMinor),
        minorToDecimal(r.inputVatMinor),
        minorToDecimal(r.inputVatOnApprovedInvoicesMinor),
        minorToDecimal(r.netVatMinor),
        minorToDecimal(r.withheldMinor),
      ])
    )
  }

  /**
   * Muhtasar list: every expense voucher issued in the period with the payee's name, tax number,
   * gross, rate and the tax withheld. The voucher numbers double as the gider pusulası register.
   */
  async withholdingCsv(period: Period): Promise<string> {
    const rows = await db
      .from('payout_documents as d')
      .join('payouts as p', 'p.id', 'd.payout_id')
      .join('orders as o', 'o.id', 'p.order_id')
      .leftJoin('payee_tax_profiles as t', (join) => {
        join
          .on('t.beneficiary_type', 'p.beneficiary_type')
          .andOn('t.beneficiary_id', 'p.beneficiary_id')
      })
      .where('d.kind', 'expense_voucher')
      .where('d.issued_on', '>=', period.from.toISODate()!)
      .where('d.issued_on', '<', period.to.toISODate()!)
      .orderBy('d.number', 'asc')
      .select(
        'd.number',
        'd.issued_on',
        'd.gross_minor',
        'd.withholding_minor',
        'd.currency',
        'o.code',
        't.legal_name',
        't.tax_number_enc',
        't.tax_office'
      )
    return toCsv(
      [
        'voucher',
        'issued_on',
        'order',
        'payee',
        'tax_number',
        'tax_office',
        'currency',
        'gross',
        'rate_percent',
        'withheld',
        'paid_to_payee',
      ],
      rows.map((r) => [
        r.number,
        DateTime.fromJSDate(new Date(r.issued_on)).toISODate(),
        r.code,
        r.legal_name,
        r.tax_number_enc ? this.encryption.decrypt(r.tax_number_enc) : null,
        r.tax_office,
        r.currency,
        minorToDecimal(r.gross_minor),
        rate(r.withholding_minor, r.gross_minor),
        minorToDecimal(r.withholding_minor),
        minorToDecimal(r.gross_minor - r.withholding_minor),
      ])
    )
  }

  /** Supplier invoices approved in the period: the purchase register (alış faturaları). */
  async purchaseInvoicesCsv(period: Period): Promise<string> {
    const rows = await db
      .from('payout_documents as d')
      .join('payouts as p', 'p.id', 'd.payout_id')
      .join('orders as o', 'o.id', 'p.order_id')
      .leftJoin('payee_tax_profiles as t', (join) => {
        join
          .on('t.beneficiary_type', 'p.beneficiary_type')
          .andOn('t.beneficiary_id', 'p.beneficiary_id')
      })
      .where('d.kind', 'supplier_invoice')
      .where('d.status', 'approved')
      .where('d.reviewed_at', '>=', sql(period.from))
      .where('d.reviewed_at', '<', sql(period.to))
      .orderBy('d.issued_on', 'asc')
      .orderBy('d.id', 'asc')
      .select(
        'd.number',
        'd.issued_on',
        'd.gross_minor',
        'd.vat_minor',
        'd.currency',
        'o.code',
        'p.tax_status',
        't.legal_name',
        't.tax_number_enc',
        't.tax_office'
      )
    return toCsv(
      [
        'invoice',
        'issued_on',
        'order',
        'supplier',
        'tax_number',
        'tax_office',
        'tax_status',
        'currency',
        'net',
        'vat',
        'gross',
      ],
      rows.map((r) => [
        r.number,
        DateTime.fromJSDate(new Date(r.issued_on)).toISODate(),
        r.code,
        r.legal_name,
        r.tax_number_enc ? this.encryption.decrypt(r.tax_number_enc) : null,
        r.tax_office,
        r.tax_status,
        r.currency,
        minorToDecimal(r.gross_minor - r.vat_minor),
        minorToDecimal(r.vat_minor),
        minorToDecimal(r.gross_minor),
      ])
    )
  }
}

/** withheld / gross as a percentage with two decimals, exact integer maths. */
function rate(withheld: number, gross: number) {
  if (gross <= 0) return '0.00'
  const basisPoints = Math.round((withheld * 10_000) / gross)
  return minorToDecimal(basisPoints)
}
