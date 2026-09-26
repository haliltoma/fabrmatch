import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { isEmailVerified } from '#services/identity/email_verification'

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
      emailVerified: isEmailVerified(this.resource),
      hasCompletedOnboarding: this.resource.roleNames.length > 0,
    }
  }
}
