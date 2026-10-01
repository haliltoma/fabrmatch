import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import Order from '#models/order'
import OrderService from '#services/orders/order_service'
import { pageMeta, pageParams } from '#services/pagination'

/** Everything support needs about one order on a single screen (admin only — shows both sides). */
export default class OrderHealthService {
  async list(filters: { q?: string; status?: string; page?: number }) {
    const { page, perPage } = pageParams({ page: filters.page })
    const query = Order.query().orderBy('id', 'desc')
    const q = filters.q?.trim()
    if (q) query.whereILike('code', `%${q.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`)
    if (filters.status) query.where('status', filters.status)
    const paginator = await query.paginate(page, perPage)
    return {
      rows: paginator.all().map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        channel: o.channel,
        totalMinor: o.totalMinor,
        currency: o.currency,
        createdAt: o.createdAt.toISO(),
      })),
      meta: pageMeta(paginator.total, page, perPage),
      statusCounts: await this.statusCounts(q),
    }
  }

  /** How many orders sit in each status (for the filter chips), within the code search if any. */
  async statusCounts(q?: string): Promise<Record<string, number>> {
    const query = db.from('orders').select('status').count('* as n').groupBy('status')
    if (q) query.whereILike('code', `%${q.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`)
    const rows = await query
    return Object.fromEntries(rows.map((r) => [r.status as string, Number(r.n)]))
  }

  async show(orderId: string) {
    const order = await Order.query()
      .where('id', orderId)
      .preload('items', (i) => i.preload('modelFile'))
      .preload('productionJobs', (j) => j.preload('manufacturerProfile'))
      .first()
    if (!order) return null

    const [audit, ledger, payments, payouts, disputes, flags, messages] = await Promise.all([
      AuditLog.query()
        .where('subjectType', 'order')
        .where('subjectId', orderId)
        .orderBy('id', 'asc'),
      db.from('ledger_entries').where('order_id', orderId).orderBy('id', 'asc'),
      db.from('payments').where('order_id', orderId).orderBy('id', 'asc'),
      db.from('payouts').where('order_id', orderId).orderBy('id', 'asc'),
      db.from('disputes').where('order_id', orderId).orderBy('id', 'asc'),
      db.from('fraud_flags').where('order_id', orderId).orderBy('id', 'asc'),
      db.from('order_messages').where('order_id', orderId).count('* as n').first(),
    ])
    const refs = payments.map((p) => p.provider_ref as string)
    const webhooks =
      refs.length === 0
        ? []
        : await db
            .from('payment_webhooks')
            .whereRaw(`payload->>'providerRef' = any(?)`, [refs])
            .orderBy('id', 'asc')

    const balances = new Map<string, number>()
    for (const e of ledger) {
      const signed = e.direction === 'debit' ? e.amount_minor : -e.amount_minor
      balances.set(e.account, (balances.get(e.account) ?? 0) + signed)
    }
    const trial = [...balances.values()].reduce((a, b) => a + b, 0)

    return {
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        channel: order.channel,
        currency: order.currency,
        subtotalMinor: order.subtotalMinor,
        shippingMinor: order.shippingMinor,
        totalMinor: order.totalMinor,
        platformFeeMinor: order.platformFeeMinor,
        sellerShareMinor: order.sellerShareMinor,
        requiredTrustTier: order.requiredTrustTier,
        matchingRound: order.matchingRound,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        shippingAddress: new OrderService().decryptShippingAddress(order),
      },
      items: order.items.map((i) => ({
        file: i.modelFile?.originalName ?? null,
        technology: i.technology,
        material: i.material,
        quantity: i.quantity,
        unitCostMinor: i.unitCostMinor,
      })),
      jobs: order.productionJobs.map((j) => ({
        id: j.id,
        status: j.status,
        alias: j.manufacturerProfile?.publicAlias ?? null,
        dueAt: j.dueAt.toISO(),
        carrier: j.carrier,
        trackingNumber: j.trackingNumber,
      })),
      timeline: audit.map((a) => ({
        at: a.createdAt.toISO(),
        action: a.action,
        actorId: a.actorId,
        meta: JSON.stringify(a.meta ?? {}),
      })),
      ledger: ledger.map((e) => ({
        id: e.id as string,
        transactionId: e.transaction_id as string,
        account: e.account as string,
        direction: e.direction as string,
        amountMinor: e.amount_minor as number,
        memo: (e.memo as string | null) ?? null,
      })),
      ledgerBalances: Object.fromEntries(balances),
      ledgerBalanced: trial === 0,
      payments: payments.map((p) => ({
        id: p.id as string,
        status: p.status as string,
        amountMinor: p.amount_minor as number,
        refundedMinor: p.refunded_minor as number,
        providerRef: p.provider_ref as string,
      })),
      webhooks: webhooks.map((w) => ({
        eventId: w.provider_event_id as string,
        type: w.type as string,
        processed: !!w.processed_at,
      })),
      payouts: payouts.map((p) => ({
        id: p.id as string,
        beneficiary: p.beneficiary_type as string,
        amountMinor: p.amount_minor as number,
        status: p.status as string,
      })),
      disputes: disputes.map((d) => ({ id: d.id as string, status: d.status as string })),
      fraudFlags: flags.map((f) => ({
        rule: f.rule as string,
        severity: f.severity as string,
        status: f.status as string,
        detail: f.detail as string,
      })),
      messageCount: Number(messages?.n ?? 0),
    }
  }
}
