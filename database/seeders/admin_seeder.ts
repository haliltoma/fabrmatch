import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import RoleService from '#services/identity/role_service'

export default class AdminSeeder extends BaseSeeder {
  async run() {
    const user = await User.firstOrCreate(
      { email: 'admin@fabrmatch.com' },
      {
        email: 'admin@fabrmatch.com',
        fullName: 'Fabrmatch Admin',
        password: 'admin12345',
      }
    )

    const roleService = new RoleService()
    await roleService.assignRole(user, 'admin')
  }
}
