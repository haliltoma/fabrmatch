import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#models/user'
import VerificationToken from '#models/verification_token'
import type { TokenType } from '#models/verification_token'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import UserSessionService from '#services/identity/user_session_service'

export default class AuthSecurityService {
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
      token,
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
    const record = await VerificationToken.query()
      .where('token', token)
      .where('type', 'email_verification')
      .whereNull('usedAt')
      .preload('user')
      .first()

    if (!record || !record.isValid) return null

    record.usedAt = DateTime.now()
    await record.save()

    const user = record.user
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
    const record = await VerificationToken.query()
      .where('token', token)
      .where('type', 'password_reset')
      .whereNull('usedAt')
      .preload('user')
      .first()

    if (!record || !record.isValid) return false

    record.usedAt = DateTime.now()
    await record.save()

    const user = record.user
    user.password = newPassword
    await user.save()
    // whoever knew the old password must not stay signed in
    await new UserSessionService().revokeAll(user.id)

    return true
  }
}
