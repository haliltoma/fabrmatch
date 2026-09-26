import fabrmatchConfig from '#config/fabrmatch'
import type User from '#models/user'

/**
 * Whether the user counts as verified. Local dev can switch the requirement off
 * (`EMAIL_VERIFICATION_REQUIRED=false`) so every account behaves as verified; production always
 * requires it, whatever the env says.
 */
export function isEmailVerified(user: Pick<User, 'emailVerifiedAt'>): boolean {
  if (!fabrmatchConfig.security.requireEmailVerification) return true
  return !!user.emailVerifiedAt
}
