import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Payout from '#models/payout'
import { pageMeta, pageParams } from '#services/pagination'

export type Beneficiary = 'manufacturer' | 'seller'

/**
 * Payout history for one beneficiary (a maker profile or a seller user). Only the order code
 * and amounts — never the other side of the order (business rule 1).
 */
export default class EarningsService {
  async summary(type: Beneficiary, beneficiaryId: number) {
    const rows = await db
      .from('payouts')
      .where('beneficiary_type', type)
      .where('beneficiary_id', beneficiaryId)
      .select('currency')
      .select(db.raw(`coalesce(sum(amount_minor) filter (where status = 'pending'), 0) as pending`))
      .select(db.raw(`coalesce(sum(amount_minor) filter (where status = 'paid'), 0) as paid`))
      .select(
        db.raw(
          `coalesce(sum(amount_minor) filter (where status = 'paid' and paid_at >= ?), 0) as paid_month`,
          [DateTime.now().startOf('month').toSQL()!]
        )
      )
      .groupBy('currency')
      .orderBy('currency')
    return rows.map((r) => ({
      currency: r.currency as string,
      pendingMinor: Number(r.pending),
      paidMinor: Number(r.paid),
      paidThisMonthMinor: Number(r.paid_month),
    }))
  }

  async list(
    type: Beneficiary,
    beneficiaryId: number,
    params: { page?: number; perPage?: number } = {}
  ) {
    const { page, perPage } = pageParams(params)
    const paginator = await Payout.query()
      .where('beneficiaryType', type)
      .where('beneficiaryId', beneficiaryId)
      .preload('order')
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    return {
      rows: paginator.all().map((p) => ({
        id: p.id,
        orderCode: p.order.code,
        amountMinor: p.amountMinor,
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt?.toISO() ?? null,
        createdAt: p.createdAt.toISO(),
      })),
      meta: pageMeta(paginator.total, page, perPage),
    }
  }
}
