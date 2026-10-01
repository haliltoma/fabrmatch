import db from '@adonisjs/lucid/services/db'
import type EncryptionService from '#services/identity/encryption_service'
import { ENCRYPTED_COLUMNS } from '#services/identity/encryption_service'

export interface RotationReport {
  table: string
  column: string
  rotated: number
  alreadyCurrent: number
  /** values neither key can open: left untouched and listed by row id */
  unreadable: string[]
}

const BATCH = 500

/**
 * Re-encrypts every encrypted column from the previous APP_KEY to the current one. Idempotent and
 * resumable: values already under the current key are skipped; each batch commits on its own.
 * A value that neither key opens is never overwritten — it is reported instead.
 */
export default class KeyRotationService {
  constructor(private encryption: EncryptionService) {}

  async rotate(options: { dryRun?: boolean } = {}): Promise<RotationReport[]> {
    const reports: RotationReport[] = []
    for (const { table, column } of ENCRYPTED_COLUMNS) {
      const report: RotationReport = {
        table,
        column,
        rotated: 0,
        alreadyCurrent: 0,
        unreadable: [],
      }
      // UUIDv7 keys sort by creation time, so keyset paging by id still walks every row once
      let lastId = '00000000-0000-0000-0000-000000000000'
      for (;;) {
        const rows: Array<{ id: string; value: string }> = await db
          .from(table)
          .whereNotNull(column)
          .where('id', '>', lastId)
          .orderBy('id', 'asc')
          .limit(BATCH)
          .select('id', `${column} as value`)
        if (rows.length === 0) break
        lastId = rows[rows.length - 1].id

        const updates: Array<{ id: string; value: string }> = []
        for (const row of rows) {
          if (this.encryption.isCurrent(row.value)) {
            report.alreadyCurrent++
            continue
          }
          let plain: string
          try {
            plain = this.encryption.decrypt(row.value)
          } catch {
            report.unreadable.push(row.id)
            continue
          }
          updates.push({ id: row.id, value: this.encryption.encrypt(plain) })
        }
        if (!options.dryRun && updates.length > 0) {
          await db.transaction(async (trx) => {
            for (const u of updates) {
              await trx
                .from(table)
                .where('id', u.id)
                .update({ [column]: u.value })
            }
          })
        }
        report.rotated += updates.length
      }
      reports.push(report)
    }
    return reports
  }
}
