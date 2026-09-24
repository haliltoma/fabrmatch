import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import { AuthorizationResponse } from '@adonisjs/bouncer'

export default class SellerPolicy extends BasePolicy {
  async before(user: User | null) {
    if (!user) return AuthorizationResponse.deny('Authentication required', 401)
  }

  async access(user: User) {
    await user.load('roles')
    return user.hasRole('seller')
      ? AuthorizationResponse.allow()
      : AuthorizationResponse.deny('Seller role required', 403)
  }
}
