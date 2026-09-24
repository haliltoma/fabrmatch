import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      roles: this.resource.roleNames,
      emailVerified: !!this.resource.emailVerifiedAt,
      hasCompletedOnboarding: this.resource.roleNames.length > 0,
    }
  }
}
