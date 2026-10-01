import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import DomainError from '#exceptions/domain_error'
import LedgerEntry from '#models/ledger_entry'
import type { LedgerAccount, LedgerDirection } from '#models/ledger_entry'

export class LedgerError extends DomainError {}

export interface LedgerLine {
  account: LedgerAccount
  direction: LedgerDirection
  amountMinor: number
  currency?: string
  /** Owner of a `seller_wallet` line (required there, forbidden elsewhere — DB checked) */
  walletUserId?: string
}

interface PostOptions {
  transactionId?: string
  orderId?: string | null
  memo?: string
  currency?: string
  trx?: TransactionClientContract
}

/** Accounts whose natural balance is a debit (assets). Everything else is credit-normal. */
const DEBIT_NORMAL: LedgerAccount[] = ['provider_cash', 'vat_receivable', 'chargeback_loss']

export default class LedgerService {
  /**
   * Posts one balanced transaction (double entry). Debits must equal credits per currency —
   * checked here and again by a deferred DB constraint trigger at COMMIT.
   */
  async post(lines: LedgerLine[], options: PostOptions = {}): Promise<string> {
    const defaultCurrency = options.currency ?? 'TRY'
    const normalized = lines.map((l) => ({ ...l, currency: l.currency ?? defaultCurrency }))

    if (normalized.length < 2) throw new LedgerError('A ledger transaction needs at least 2 lines')

    const imbalance = new Map<string, number>()
    for (const line of normalized) {
      if (!Number.isSafeInteger(line.amountMinor) || line.amountMinor <= 0) {
        throw new LedgerError(`Ledger amount must be a positive integer, got ${line.amountMinor}`)
      }
      const signed = line.direction === 'debit' ? line.amountMinor : -line.amountMinor
      imbalance.set(line.currency, (imbalance.get(line.currency) ?? 0) + signed)
    }
    for (const [currency, diff] of imbalance) {
      if (diff !== 0) throw new LedgerError(`Unbalanced ledger transaction: ${diff} ${currency}`)
    }

    const transactionId = options.transactionId ?? randomUUID()
    const run = async (trx: TransactionClientContract) => {
      await LedgerEntry.createMany(
        normalized.map((line) => ({
          transactionId,
          account: line.account,
          direction: line.direction,
          amountMinor: line.amountMinor,
          currency: line.currency,
          orderId: options.orderId ?? null,
          walletUserId: line.walletUserId ?? null,
          memo: options.memo ?? null,
        })),
        { client: trx }
      )
    }

    if (options.trx) await run(options.trx)
    else await db.transaction(run)
    return transactionId
  }

  /** Balance on the account's normal side (debit-normal: debits − credits, else credits − debits). */
  async balance(
    account: LedgerAccount,
    filter: {
      orderId?: string
      walletUserId?: string
      currency?: string
      trx?: TransactionClientContract
    } = {}
  ): Promise<number> {
    const query = (filter.trx ?? db)
      .from('ledger_entries')
      .where('account', account)
      .where('currency', filter.currency ?? 'TRY')
    if (filter.orderId !== undefined) query.where('order_id', filter.orderId)
    if (filter.walletUserId !== undefined) query.where('wallet_user_id', filter.walletUserId)

    const row = await query
      .select(
        db.raw(
          `coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0) as debits`
        ),
        db.raw(
          `coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0) as credits`
        )
      )
      .first()

    const debits = Number(row.debits)
    const credits = Number(row.credits)
    return DEBIT_NORMAL.includes(account) ? debits - credits : credits - debits
  }

  /** Net of every entry — must always be exactly 0. */
  async trialBalance(filter: { orderId?: string; currency?: string } = {}): Promise<number> {
    const query = db.from('ledger_entries').where('currency', filter.currency ?? 'TRY')
    if (filter.orderId !== undefined) query.where('order_id', filter.orderId)
    const row = await query
      .select(
        db.raw(
          `coalesce(sum(case when direction = 'debit' then amount_minor else -amount_minor end), 0) as net`
        )
      )
      .first()
    return Number(row.net)
  }
}
