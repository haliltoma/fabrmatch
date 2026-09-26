import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * APP_KEY rotation, step 2 of 3 (see docs/SECURITY.md):
 *   1. deploy with the new APP_KEY and the old one as APP_KEY_PREVIOUS (reads keep working)
 *   2. node ace security:rotate-key            (re-encrypts every sensitive column)
 *   3. remove APP_KEY_PREVIOUS once it reports nothing left and nothing unreadable
 */
export default class RotateAppKey extends BaseCommand {
  static commandName = 'security:rotate-key'
  static description = 'Re-encrypt sensitive columns from APP_KEY_PREVIOUS to APP_KEY'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Count what would change without writing' })
  declare dryRun: boolean

  async run() {
    const { default: env } = await import('#start/env')
    if (!env.get('APP_KEY_PREVIOUS')) {
      this.logger.error('Set APP_KEY_PREVIOUS to the old key first (and APP_KEY to the new one).')
      this.exitCode = 1
      return
    }
    const { default: EncryptionService } = await import('#services/identity/encryption_service')
    const { default: KeyRotationService } = await import('#services/identity/key_rotation_service')
    const reports = await new KeyRotationService(new EncryptionService()).rotate({
      dryRun: this.dryRun,
    })

    let unreadable = 0
    for (const r of reports) {
      unreadable += r.unreadable.length
      this.logger.info(
        `${r.table}.${r.column}: ${r.rotated} ${this.dryRun ? 'to rotate' : 'rotated'}, ` +
          `${r.alreadyCurrent} already on the new key` +
          (r.unreadable.length ? `, UNREADABLE ids: ${r.unreadable.join(', ')}` : '')
      )
    }
    if (unreadable > 0) {
      this.logger.error(`${unreadable} value(s) open with neither key; keep APP_KEY_PREVIOUS.`)
      this.exitCode = 1
      return
    }
    this.logger.success(
      this.dryRun ? 'Dry run finished.' : 'Done. APP_KEY_PREVIOUS can be removed now.'
    )
  }
}
