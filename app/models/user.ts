import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import UserRole from '#models/user_role'
import type { Role } from '#models/user_role'
import SellerProfile from '#models/seller_profile'
import ManufacturerProfile from '#models/manufacturer_profile'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @hasMany(() => UserRole)
  declare roles: HasMany<typeof UserRole>

  @hasOne(() => SellerProfile)
  declare sellerProfile: HasOne<typeof SellerProfile>

  @hasOne(() => ManufacturerProfile)
  declare manufacturerProfile: HasOne<typeof ManufacturerProfile>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  hasRole(role: Role): boolean {
    if (!this.$preloaded.roles) {
      throw new Error('Roles must be preloaded before calling hasRole()')
    }
    return this.roles.some((r) => r.role === role)
  }

  get roleNames(): Role[] {
    if (!this.$preloaded.roles) return []
    return this.roles.map((r) => r.role)
  }
}
