import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import RoleService from '#services/identity/role_service'

export default class AdminSeeder extends BaseSeeder {
  async run() {
    // production takes the first admin from the shell (never the well-known dev password)
    const email = process.env.ADMIN_EMAIL ?? 'admin@fabrmatch.com'
    const password = process.env.ADMIN_PASSWORD ?? 'admin12345'
    if (app.inProduction && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to seed the admin in production')
    }

    const user = await User.firstOrCreate(
      { email },
      // the operator owns this inbox; seeding is the verification
      { email, fullName: 'Fabrmatch Admin', password, emailVerifiedAt: DateTime.now() }
    )

    const roleService = new RoleService()
    await roleService.assignRole(user, 'admin')
  }
}
