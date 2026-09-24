import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import LedgerService, { LedgerError } from '#services/payments/ledger_service'
import type { LedgerLine } from '#services/payments/ledger_service'
import type { LedgerAccount } from '#models/ledger_entry'

const ACCOUNTS: LedgerAccount[] = [
  'provider_cash',
  'buyer_escrow',
  'platform_fee',
  'manufacturer_payable',
  'seller_payable',
  'refund',
]

function seededRandom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

test.group('LedgerService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('posts a balanced transaction and reports balances on the normal side', async ({
    assert,
  }) => {
    const ledger = new LedgerService()
    await ledger.post([
      { account: 'provider_cash', direction: 'debit', amountMinor: 10_000 },
      { account: 'buyer_escrow', direction: 'credit', amountMinor: 10_000 },
    ])

    assert.equal(await ledger.balance('provider_cash'), 10_000)
    assert.equal(await ledger.balance('buyer_escrow'), 10_000)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('rejects unbalanced, empty-side, non-integer and non-positive lines', async ({ assert }) => {
    const ledger = new LedgerService()
    const bad: LedgerLine[][] = [
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: 100 },
        { account: 'buyer_escrow', direction: 'credit', amountMinor: 99 },
      ],
      [{ account: 'provider_cash', direction: 'debit', amountMinor: 100 }],
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: 10.5 },
        { account: 'buyer_escrow', direction: 'credit', amountMinor: 10.5 },
      ],
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: 0 },
        { account: 'buyer_escrow', direction: 'credit', amountMinor: 0 },
      ],
    ]
    for (const lines of bad) {
      await assert.rejects(() => ledger.post(lines), LedgerError as never)
    }
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('imbalance is checked per currency', async ({ assert }) => {
    const ledger = new LedgerService()
    await assert.rejects(
      () =>
        ledger.post([
          { account: 'provider_cash', direction: 'debit', amountMinor: 100, currency: 'TRY' },
          { account: 'buyer_escrow', direction: 'credit', amountMinor: 100, currency: 'USD' },
        ]),
      LedgerError as never
    )
  })

  test('the database itself refuses an unbalanced transaction at commit', async ({ assert }) => {
    const trx = await db.transaction()
    try {
      await trx.rawQuery('set constraints ledger_entries_balanced immediate')
      await assert.rejects(async () => {
        await trx.table('ledger_entries').insert({
          transaction_id: '00000000-0000-4000-8000-000000000001',
          account: 'provider_cash',
          direction: 'debit',
          amount_minor: 500,
          currency: 'TRY',
          created_at: new Date(),
        })
      }, /unbalanced/)
    } finally {
      await trx.rollback()
    }
  })

  test('property: any random sequence of balanced transactions nets to zero', async ({
    assert,
  }) => {
    const ledger = new LedgerService()
    const rand = seededRandom(7)

    for (let i = 0; i < 200; i++) {
      // random split of a random total across random accounts on each side
      const total = 1 + Math.floor(rand() * 100_000)
      const split = (parts: number) => {
        const cuts = Array.from({ length: parts - 1 }, () => Math.floor(rand() * total)).sort(
          (a, b) => a - b
        )
        const bounds = [0, ...cuts, total]
        return bounds.slice(1).map((b, idx) => b - bounds[idx])
      }
      const pick = () => ACCOUNTS[Math.floor(rand() * ACCOUNTS.length)]

      const debits = split(1 + Math.floor(rand() * 3)).filter((n) => n > 0)
      const credits = split(1 + Math.floor(rand() * 3)).filter((n) => n > 0)
      await ledger.post([
        ...debits.map((amountMinor) => ({
          account: pick(),
          direction: 'debit' as const,
          amountMinor,
        })),
        ...credits.map((amountMinor) => ({
          account: pick(),
          direction: 'credit' as const,
          amountMinor,
        })),
      ])
    }

    assert.equal(await ledger.trialBalance(), 0)
  })

  const seedEntry = () =>
    new LedgerService().post([
      { account: 'provider_cash', direction: 'debit', amountMinor: 100 },
      { account: 'buyer_escrow', direction: 'credit', amountMinor: 100 },
    ])

  test('entries are append-only: update is refused by the database', async ({ assert }) => {
    await seedEntry()
    await assert.rejects(() => db.from('ledger_entries').update({ amount_minor: 1 }), /append-only/)
  })

  test('entries are append-only: delete is refused by the database', async ({ assert }) => {
    await seedEntry()
    await assert.rejects(() => db.from('ledger_entries').delete(), /append-only/)
  })
})
