import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import Setting from '#models/setting'
import { SETTING_DEFINITIONS } from '#services/settings/definitions'

export class SettingsError extends DomainError {}

type Config = Record<string, Record<string, number>>
const live = fabrmatchConfig as unknown as Config
const DEFAULTS: Record<string, number> = Object.fromEntries(
  SETTING_DEFINITIONS.map((d) => {
    const [section, name] = d.key.split('.')
    return [d.key, live[section][name]]
  })
)

function apply(key: string, value: number) {
  const [section, name] = key.split('.')
  live[section][name] = value
}

function definitionOf(key: string) {
  const def = SETTING_DEFINITIONS.find((d) => d.key === key)
  if (!def) throw new SettingsError(`Unknown setting "${key}"`)
  return def
}

/**
 * Admin-editable settings. The values live in the `settings` table and are applied onto the
 * in-memory `fabrmatchConfig` (which keeps the defaults), so every consumer stays synchronous.
 * `syncFromDatabase` runs at boot and on an interval to pick up changes made in other processes.
 */
export default class SettingsService {
  defaultOf(key: string): number {
    return DEFAULTS[key]
  }

  /** Current effective values with their defaults, for the admin screen. */
  async list() {
    const rows = await Setting.query()
    const stored = new Map(rows.map((r) => [r.key, r]))
    return SETTING_DEFINITIONS.map((def) => {
      const row = stored.get(def.key)
      return {
        ...def,
        value: typeof row?.value === 'number' ? row.value : DEFAULTS[def.key],
        defaultValue: DEFAULTS[def.key],
        overridden: !!row,
        updatedAt: row?.updatedAt?.toISO() ?? null,
      }
    })
  }

  async syncFromDatabase(): Promise<void> {
    const rows = await Setting.query()
    const stored = new Map(rows.map((r) => [r.key, r.value]))
    for (const def of SETTING_DEFINITIONS) {
      const value = stored.get(def.key)
      apply(def.key, typeof value === 'number' ? value : DEFAULTS[def.key])
    }
  }

  async set(key: string, value: number, adminId: number): Promise<void> {
    const def = definitionOf(key)
    if (!Number.isFinite(value) || (def.integer && !Number.isInteger(value))) {
      throw new SettingsError(`${def.label} must be ${def.integer ? 'a whole number' : 'a number'}`)
    }
    if (value < def.min || value > def.max) {
      throw new SettingsError(`${def.label} must be between ${def.min} and ${def.max}`)
    }

    await db.transaction(async (trx) => {
      const existing = await Setting.query({ client: trx }).where('key', key).forUpdate().first()
      const before = typeof existing?.value === 'number' ? existing.value : DEFAULTS[key]
      if (before === value && existing) return

      if (existing) {
        existing.value = value
        existing.updatedBy = adminId
        await existing.useTransaction(trx).save()
      } else {
        await Setting.create({ key, value, updatedBy: adminId }, { client: trx })
      }
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'setting.changed',
          subjectType: 'setting',
          subjectId: 0,
          meta: { key, from: before, to: value },
        },
        { client: trx }
      )
    })
    apply(key, value)
  }

  /** Removes the override; the default from `config/fabrmatch.ts` applies again. */
  async reset(key: string, adminId: number): Promise<void> {
    definitionOf(key)
    const removed = await db.transaction(async (trx) => {
      const existing = await Setting.query({ client: trx }).where('key', key).forUpdate().first()
      if (!existing) return false
      await existing.useTransaction(trx).delete()
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'setting.reset',
          subjectType: 'setting',
          subjectId: 0,
          meta: { key, to: DEFAULTS[key] },
        },
        { client: trx }
      )
      return true
    })
    if (removed) apply(key, DEFAULTS[key])
  }
}
