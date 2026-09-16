import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Sistem B admin arayüzü gelene kadar üretici başvurusunu onaylamak için.
 *   node ace manufacturer:activate maker@example.com
 */
export default class ManufacturerActivate extends BaseCommand {
  static commandName = 'manufacturer:activate'
  static description = 'Activate a pending manufacturer by the owner user email'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Email of the manufacturer user' })
  declare email: string

  async run() {
    const { default: User } = await import('#models/user')
    const { default: Manufacturer } = await import('#models/manufacturer')

    const user = await User.query().where('email', this.email).first()
    const manufacturer = user ? await Manufacturer.query().where('user_id', user.id).first() : null
    if (!manufacturer) {
      this.logger.error(`No manufacturer profile found for ${this.email}`)
      this.exitCode = 1
      return
    }

    manufacturer.status = 'active'
    await manufacturer.save()
    this.logger.success(`${manufacturer.displayName} (${manufacturer.publicCode}) is now active`)
  }
}
