import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import AuditLog from '#models/audit_log'
import LedgerService from '#services/payments/ledger_service'

export interface Discrepancy {
  kind:
    | 'unbalanced_order'
    | 'unbalanced_transaction'
    | 'negative_balance'
    | 'cash_mismatch'
    | 'payout_overdue'
  orderId: number | null
  detail: string
}

/**
 * Daily self-check (PRD §11 "mutabakat"): the ledger must agree with the payment and payout
 * records. Comparing against the provider's own settlement report is added with the iyzico
 * adapter (F5-T2); the interface has no report call yet.
 */
export default class ReconciliationService {
  private ledger = new LedgerService()

  async run(): Promise<Discrepancy[]> {
    const found: Discrepancy[] = []

    const global = await this.ledger.trialBalance()
    if (global !== 0) {
      found.push({ kind: 'unbalanced_order', orderId: null, detail: `trial balance is ${global}` })
    }

    // ledger invariants (X-7): every transaction balances per currency, no account goes negative
    const unbalanced = await db.rawQuery(
      `select transaction_id, currency, min(order_id) as order_id,
              sum(case when direction = 'debit' then amount_minor else -amount_minor end) as net
         from ledger_entries
        group by transaction_id, currency
       having sum(case when direction = 'debit' then amount_minor else -amount_minor end) <> 0`
    )
    for (const row of unbalanced.rows as Array<{
      transaction_id: string
      currency: string
      order_id: number | null
      net: string
    }>) {
      found.push({
        kind: 'unbalanced_transaction',
        orderId: row.order_id,
        detail: `transaction ${row.transaction_id} is off by ${row.net} ${row.currency}`,
      })
    }

    const negative = await db.rawQuery(
      `select order_id, account, currency,
              sum(case when (account in ('provider_cash', 'vat_receivable', 'chargeback_loss')) = (direction = 'debit')
                       then amount_minor else -amount_minor end) as balance
         from ledger_entries
        where order_id is not null
          -- per-user, checked below
          and account <> 'seller_wallet'
          -- an order paid from the wallet got its cash at the top-up, not on the order
          and not (account = 'provider_cash'
                   and order_id in (select order_id from payments where provider = 'wallet'))
        group by order_id, account, currency
       having sum(case when (account in ('provider_cash', 'vat_receivable', 'chargeback_loss')) = (direction = 'debit')
                       then amount_minor else -amount_minor end) < 0`
    )
    for (const row of negative.rows as Array<{
      order_id: number
      account: string
      currency: string
      balance: string
    }>) {
      found.push({
        kind: 'negative_balance',
        orderId: row.order_id,
        detail: `${row.account} is ${row.balance} ${row.currency}`,
      })
    }

    // a seller's wallet can never go below zero
    const wallets = await db.rawQuery(
      `select wallet_user_id, currency,
              sum(case when direction = 'credit' then amount_minor else -amount_minor end) as balance
         from ledger_entries
        where account = 'seller_wallet'
        group by wallet_user_id, currency
       having sum(case when direction = 'credit' then amount_minor else -amount_minor end) < 0`
    )
    for (const row of wallets.rows as Array<{
      wallet_user_id: number
      currency: string
      balance: string
    }>) {
      found.push({
        kind: 'negative_balance',
        orderId: null,
        detail: `seller_wallet of user ${row.wallet_user_id} is ${row.balance} ${row.currency}`,
      })
    }

    // cash the ledger says we hold at the provider vs. what payments/payouts imply
    const rows = await db.rawQuery(
      `select p.order_id,
              sum(p.amount_minor - p.refunded_minor) as captured,
              coalesce((select sum(amount_minor) from payouts where order_id = p.order_id and status = 'paid'), 0) as paid_out,
              coalesce((select sum(written_off_minor) from chargebacks where order_id = p.order_id and status = 'lost'), 0) as charged_back,
              coalesce((select sum(case when direction = 'debit' then amount_minor else -amount_minor end)
                          from ledger_entries where order_id = p.order_id and account = 'provider_cash'), 0) as ledger_cash
         from payments p
        where p.status in ('succeeded', 'partially_refunded', 'refunded')
          and p.order_id is not null
          and p.provider <> 'wallet'
        group by p.order_id`
    )
    for (const row of rows.rows as Array<{
      order_id: number
      captured: string
      paid_out: string
      charged_back: string
      ledger_cash: string
    }>) {
      const expected = Number(row.captured) - Number(row.paid_out) - Number(row.charged_back)
      if (expected !== Number(row.ledger_cash)) {
        found.push({
          kind: 'cash_mismatch',
          orderId: row.order_id,
          detail: `expected ${expected}, ledger ${row.ledger_cash}`,
        })
      }
    }

    // completed long ago but the money is still sitting in escrow
    const overdue = await db.rawQuery(
      `select o.id from orders o
        where o.status = 'completed'
          and o.completed_at < now() - interval '1 day'
          and (select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0)
                 from ledger_entries where order_id = o.id and account = 'buyer_escrow') > 0`
    )
    for (const row of overdue.rows as Array<{ id: number }>) {
      found.push({
        kind: 'payout_overdue',
        orderId: row.id,
        detail: 'completed >1 day ago, escrow not released',
      })
    }

    for (const d of found) {
      logger.error({ msg: 'reconciliation discrepancy', ...d })
      await AuditLog.create({
        action: 'reconcile.discrepancy',
        subjectType: d.orderId ? 'order' : 'ledger',
        subjectId: d.orderId ?? 0,
        meta: { kind: d.kind, detail: d.detail },
      })
    }
    return found
  }
}
