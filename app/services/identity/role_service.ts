import UserRole from '#models/user_role'
import type { Role } from '#models/user_role'
import type User from '#models/user'

export default class RoleService {
  async assignRole(user: User, role: Role): Promise<UserRole> {
    return UserRole.firstOrCreate({ userId: user.id, role }, { userId: user.id, role })
  }

  async removeRole(user: User, role: Role): Promise<void> {
    await UserRole.query().where('userId', user.id).where('role', role).delete()
  }

  async hasRole(user: User, role: Role): Promise<boolean> {
    const exists = await UserRole.query().where('userId', user.id).where('role', role).first()
    return !!exists
  }

  async getUserRoles(user: User): Promise<Role[]> {
    const roles = await UserRole.query().where('userId', user.id)
    return roles.map((r) => r.role)
  }
}
