import { createHash, randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import User from '#models/user'
import VerificationToken from '#models/verification_token'
import type { TokenType } from '#models/verification_token'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import UserSessionService from '#services/identity/user_session_service'

/**
 * What the database stores for an e-mailed token: its SHA-256. A leaked backup or a read-only
 * query can then not be turned into a working reset link (review fix).
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export default class AuthSecurityService {
  /**
   * Spends a live token in one statement: of two requests racing with the same link, only one
   * gets the user id back. Returns null for unknown, used or expired tokens.
   */
  private async consume(token: string, type: TokenType): Promise<number | null> {
    const result = await db.rawQuery(
      `update verification_tokens set used_at = now()
        where token = ? and type = ? and used_at is null and expires_at > now()
        returning user_id`,
      [hashToken(token), type]
    )
    return (result.rows[0]?.user_id as number | undefined) ?? null
  }

  private async createToken(userId: number, type: TokenType, hoursValid: number): Promise<string> {
    // Invalidate existing tokens of same type
    await VerificationToken.query()
      .where('userId', userId)
      .where('type', type)
      .whereNull('usedAt')
      .update({ usedAt: DateTime.now().toSQL() })

    const token = randomBytes(32).toString('hex')

    await VerificationToken.create({
      userId,
      type,
      token: hashToken(token),
      expiresAt: DateTime.now().plus({ hours: hoursValid }),
    })

    return token
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.createToken(user.id, 'email_verification', 24)
    const appUrl = env.get('APP_URL')
    const verifyUrl = `${appUrl}/verify-email?token=${token}`
    const tr = user.locale === 'tr'

    await mail.send((message) => {
      message
        .to(user.email)
        .subject(tr ? 'E-postanı doğrula — Fabrmatch' : 'Verify your email — Fabrmatch')
        .htmlView('emails/verify_email', { user, verifyUrl, tr })
    })
  }

  async verifyEmail(token: string): Promise<User | null> {
    const userId = await this.consume(token, 'email_verification')
    if (userId === null) return null

    const user = await User.findOrFail(userId)
    await user.merge({ emailVerifiedAt: DateTime.now() } as any).save()

    return user
  }

  async sendPasswordReset(email: string): Promise<void> {
    const user = await User.findBy('email', email)
    if (!user) return // Don't reveal if email exists

    const token = await this.createToken(user.id, 'password_reset', 1)
    const appUrl = env.get('APP_URL')
    const resetUrl = `${appUrl}/reset-password?token=${token}`
    const tr = user.locale === 'tr'

    await mail.send((message) => {
      message
        .to(user.email)
        .subject(tr ? 'Parolanı sıfırla — Fabrmatch' : 'Reset your password — Fabrmatch')
        .htmlView('emails/reset_password', { user, resetUrl, tr })
    })
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const userId = await this.consume(token, 'password_reset')
    if (userId === null) return false

    const user = await User.findOrFail(userId)
    user.password = newPassword
    await user.save()
    // whoever knew the old password must not stay signed in
    await new UserSessionService().revokeAll(user.id)

    return true
  }
}
