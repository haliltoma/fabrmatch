import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { minorToDecimal, toCsv } from '#services/reports/csv'

export interface Period {
  /** inclusive */
  from: DateTime
  /** exclusive */
  to: DateTime
  label: string
}

export function monthPeriod(year: number, month: number): Period {
  const from = DateTime.fromObject({ year, month, day: 1 })
  if (!from.isValid) throw new Error('Invalid month')
  return { from, to: from.plus({ months: 1 }), label: from.toFormat('yyyy-MM') }
}

export interface SummaryRow {
  currency: string
  ordersCompleted: number
  grossMinor: number
  vatMinor: number
  discountMinor: number
  platformFeeMinor: number
  refundedMinor: number
  makerPayoutsMinor: number
  sellerPayoutsMinor: number
}

const sql = (d: DateTime) => d.toSQL()!

/**
 * Money reports for accounting. Amounts are never added across currencies: every figure is per
 * currency. Nothing here names a buyer or (outside admin exports) a maker (business rule 1).
 */
export default class FinancialReportService {
  async summary(period: Period): Promise<SummaryRow[]> {
    const rows = new Map<string, SummaryRow>()
    const row = (currency: string) => {
      let r = rows.get(currency)
      if (!r) {
        r = {
          currency,
          ordersCompleted: 0,
          grossMinor: 0,
          vatMinor: 0,
          discountMinor: 0,
          platformFeeMinor: 0,
          refundedMinor: 0,
          makerPayoutsMinor: 0,
          sellerPayoutsMinor: 0,
        }
        rows.set(currency, r)
      }
      return r
    }

    const orders = await db
      .from('orders')
      .where('status', 'completed')
      .where('completed_at', '>=', sql(period.from))
      .where('completed_at', '<', sql(period.to))
      .groupBy('currency')
      .select('currency')
      .count('* as n')
      .sum('total_minor as gross')
      .sum('tax_minor as vat')
      .sum('discount_minor as discount')
    for (const o of orders) {
      const r = row(o.currency)
      r.ordersCompleted = Number(o.n)
      r.grossMinor = Number(o.gross)
      r.vatMinor = Number(o.vat)
      r.discountMinor = Number(o.discount)
    }

    const fee = await db.rawQuery(
      `select currency,
              coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0) as fee
         from ledger_entries
        where account = 'platform_fee' and created_at >= ? and created_at < ?
        group by currency`,
      [sql(period.from), sql(period.to)]
    )
    for (const f of fee.rows as Array<{ currency: string; fee: string }>) {
      row(f.currency).platformFeeMinor = Number(f.fee)
    }

    // a refund is paid out when the `refund` account is debited
    const refunds = await db.rawQuery(
      `select currency, coalesce(sum(amount_minor), 0) as total
         from ledger_entries
        where account = 'refund' and direction = 'debit' and created_at >= ? and created_at < ?
        group by currency`,
      [sql(period.from), sql(period.to)]
    )
    for (const r of refunds.rows as Array<{ currency: string; total: string }>) {
      row(r.currency).refundedMinor = Number(r.total)
    }

    const payouts = await db
      .from('payouts')
      .where('status', 'paid')
      .where('paid_at', '>=', sql(period.from))
      .where('paid_at', '<', sql(period.to))
      .groupBy('currency', 'beneficiary_type')
      .select('currency', 'beneficiary_type')
      .sum('amount_minor as total')
    for (const p of payouts) {
      const r = row(p.currency)
      if (p.beneficiary_type === 'manufacturer') r.makerPayoutsMinor = Number(p.total)
      else r.sellerPayoutsMinor = Number(p.total)
    }
    return [...rows.values()].sort((a, b) => a.currency.localeCompare(b.currency))
  }

  summaryCsv(period: Period, rows: SummaryRow[]): string {
    return toCsv(
      [
        'period',
        'currency',
        'orders_completed',
        'gross_total',
        'vat_included',
        'discounts_given',
        'platform_fee_earned',
        'refunds_paid',
        'maker_payouts_paid',
        'seller_payouts_paid',
      ],
      rows.map((r) => [
        period.label,
        r.currency,
        r.ordersCompleted,
        minorToDecimal(r.grossMinor),
        minorToDecimal(r.vatMinor),
        minorToDecimal(r.discountMinor),
        minorToDecimal(r.platformFeeMinor),
        minorToDecimal(r.refundedMinor),
        minorToDecimal(r.makerPayoutsMinor),
        minorToDecimal(r.sellerPayoutsMinor),
      ])
    )
  }

  /** One line per order completed in the period; no buyer, seller or maker identity. */
  async ordersCsv(period: Period): Promise<string> {
    const orders = await db
      .from('orders')
      .where('status', 'completed')
      .where('completed_at', '>=', sql(period.from))
      .where('completed_at', '<', sql(period.to))
      .orderBy('completed_at', 'asc')
      .orderBy('id', 'asc')
      .select(
        'code',
        'channel',
        'currency',
        'completed_at',
        'total_minor',
        'shipping_minor',
        'tax_rate_bps',
        'tax_minor',
        'discount_minor',
        'platform_fee_minor',
        'seller_share_minor'
      )
    return toCsv(
      [
        'order',
        'channel',
        'currency',
        'completed_at',
        'total',
        'shipping',
        'vat_rate_percent',
        'vat_included',
        'discount',
        'platform_fee',
        'seller_share',
      ],
      orders.map((o) => [
        o.code,
        o.channel,
        o.currency,
        DateTime.fromJSDate(new Date(o.completed_at)).toUTC().toISO(),
        minorToDecimal(o.total_minor),
        minorToDecimal(o.shipping_minor),
        o.tax_rate_bps / 100,
        minorToDecimal(o.tax_minor),
        minorToDecimal(o.discount_minor),
        minorToDecimal(o.platform_fee_minor),
        minorToDecimal(o.seller_share_minor),
      ])
    )
  }

  /**
   * What coupons cost in the period: orders completed in it that used a code, per coupon and
   * currency. The discount comes out of the platform fee, so it is the platform's cost.
   */
  async couponsCsv(period: Period): Promise<string> {
    const rows = await db
      .from('coupon_redemptions as cr')
      .join('orders as o', 'o.id', 'cr.order_id')
      .join('coupons as c', 'c.id', 'cr.coupon_id')
      .where('o.status', 'completed')
      .where('o.completed_at', '>=', sql(period.from))
      .where('o.completed_at', '<', sql(period.to))
      .groupBy('c.code', 'o.currency')
      .orderBy('c.code', 'asc')
      .orderBy('o.currency', 'asc')
      .select('c.code', 'o.currency')
      .count('* as orders')
      .sum('o.discount_minor as discount')
      .sum('o.total_minor as total')
      .sum('o.platform_fee_minor as fee')
    return toCsv(
      [
        'coupon',
        'currency',
        'orders',
        'discount_cost',
        'order_total',
        'platform_fee_after_discount',
      ],
      rows.map((r) => [
        r.code,
        r.currency,
        Number(r.orders),
        minorToDecimal(Number(r.discount)),
        minorToDecimal(Number(r.total)),
        minorToDecimal(Number(r.fee)),
      ])
    )
  }

  /**
   * Payouts paid in the period. Admin export lists every beneficiary (by internal id); a member's own
   * statement is limited to their payouts and shows only the order code and amounts.
   */
  async payoutsCsv(
    period: Period,
    scope: { type: 'manufacturer' | 'seller'; beneficiaryId: number } | null
  ): Promise<string> {
    const query = db
      .from('payouts as p')
      .join('orders as o', 'o.id', 'p.order_id')
      .where('p.status', 'paid')
      .where('p.paid_at', '>=', sql(period.from))
      .where('p.paid_at', '<', sql(period.to))
      .orderBy('p.paid_at', 'asc')
      .orderBy('p.id', 'asc')
      .select(
        'p.id',
        'p.paid_at',
        'p.beneficiary_type',
        'p.beneficiary_id',
        'p.amount_minor',
        'p.currency',
        'o.code as order_code'
      )
    if (scope) {
      query.where('p.beneficiary_type', scope.type).where('p.beneficiary_id', scope.beneficiaryId)
    }
    const rows = await query
    const stamp = (v: unknown) =>
      DateTime.fromJSDate(new Date(v as string))
        .toUTC()
        .toISO()
    if (scope) {
      return toCsv(
        ['payout', 'paid_at', 'order', 'amount', 'currency'],
        rows.map((r) => [
          r.id,
          stamp(r.paid_at),
          r.order_code,
          minorToDecimal(r.amount_minor),
          r.currency,
        ])
      )
    }
    return toCsv(
      ['payout', 'paid_at', 'order', 'beneficiary_type', 'beneficiary_id', 'amount', 'currency'],
      rows.map((r) => [
        r.id,
        stamp(r.paid_at),
        r.order_code,
        r.beneficiary_type,
        r.beneficiary_id,
        minorToDecimal(r.amount_minor),
        r.currency,
      ])
    )
  }
}
