import DomainError from '#exceptions/domain_error'
import { createHash, randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import TwoFactorBackupCode from '#models/two_factor_backup_code'
import type User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import TotpService from '#services/identity/totp_service'

export class TwoFactorError extends DomainError {}

const BACKUP_CODE_COUNT = 10

const hashCode = (code: string) => createHash('sha256').update(code).digest('hex')
const normalise = (code: string) => code.replaceAll(/[\s-]/g, '').toLowerCase()

function newBackupCode(): string {
  // 10 hex chars ≈ 40 bits, shown as xxxxx-xxxxx
  const raw = randomBytes(5).toString('hex')
  return `${raw.slice(0, 5)}-${raw.slice(5)}`
}

export default class TwoFactorService {
  private totp = new TotpService()
  private encryption = new EncryptionService()

  isEnabled(user: User): boolean {
    return !!user.twoFactorEnabledAt && !!user.twoFactorSecretEnc
  }

  startSetupUri(user: User, secret: string): string {
    return this.totp.otpauthUri(user.email, secret)
  }

  startSetup(user: User) {
    if (this.isEnabled(user)) throw new TwoFactorError('Two-factor authentication is already on')
    const secret = this.totp.generateSecret()
    return { secret, uri: this.totp.otpauthUri(user.email, secret) }
  }

  /** Confirms the first code from the authenticator app, switches 2FA on, returns backup codes once. */
  async enable(user: User, secret: string, code: string): Promise<string[]> {
    if (this.isEnabled(user)) throw new TwoFactorError('Two-factor authentication is already on')
    const step = this.totp.verify(secret, code)
    if (step === null) throw new TwoFactorError('That code is not right. Check your app and retry.')

    return db.transaction(async (trx) => {
      user.useTransaction(trx)
      user.twoFactorSecretEnc = this.encryption.encrypt(secret)
      user.twoFactorEnabledAt = DateTime.now()
      user.twoFactorLastStep = step
      await user.save()
      const codes = await this.replaceBackupCodes(user.id, trx)
      await AuditLog.create(
        {
          actorId: user.id,
          action: 'auth.two_factor_enabled',
          subjectType: 'user',
          subjectId: user.id,
          meta: {},
        },
        { client: trx }
      )
      return codes
    })
  }

  /** Checks a login code: an authenticator code (no replays) or a one-time backup code. */
  async verifyLogin(user: User, input: string): Promise<'totp' | 'backup' | null> {
    if (!this.isEnabled(user)) return null
    const secret = this.encryption.decrypt(user.twoFactorSecretEnc!)

    const step = this.totp.verify(secret, input, {
      lastStep: user.twoFactorLastStep === null ? null : Number(user.twoFactorLastStep),
    })
    if (step !== null) {
      // conditional update: two parallel requests cannot both spend the same step
      const updated = await db
        .from('users')
        .where('id', user.id)
        .where((q) =>
          q.whereNull('two_factor_last_step').orWhere('two_factor_last_step', '<', step)
        )
        .update({ two_factor_last_step: step })
        .returning('id')
      if (updated.length === 0) return null
      user.twoFactorLastStep = step
      return 'totp'
    }

    const used = await TwoFactorBackupCode.query()
      .where('userId', user.id)
      .where('codeHash', hashCode(normalise(input)))
      .whereNull('usedAt')
      .update({ usedAt: DateTime.now().toSQL() })
      .returning('id')
    if (used.length > 0) {
      await AuditLog.create({
        actorId: user.id,
        action: 'auth.backup_code_used',
        subjectType: 'user',
        subjectId: user.id,
        meta: {},
      })
      return 'backup'
    }
    return null
  }

  async backupCodesRemaining(userId: string): Promise<number> {
    const row = await TwoFactorBackupCode.query()
      .where('userId', userId)
      .whereNull('usedAt')
      .count('* as n')
      .first()
    return Number(row?.$extras.n ?? 0)
  }

  /** Needs the password and a current code: a stolen session alone cannot turn 2FA off. */
  async disable(user: User, password: string, code: string): Promise<void> {
    if (!(await hash.verify(user.password, password))) {
      throw new TwoFactorError('Password is not correct')
    }
    if ((await this.verifyLogin(user, code)) === null) {
      throw new TwoFactorError('That code is not right')
    }
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      user.twoFactorSecretEnc = null
      user.twoFactorEnabledAt = null
      user.twoFactorLastStep = null
      await user.save()
      await TwoFactorBackupCode.query({ client: trx }).where('userId', user.id).delete()
      await AuditLog.create(
        {
          actorId: user.id,
          action: 'auth.two_factor_disabled',
          subjectType: 'user',
          subjectId: user.id,
          meta: {},
        },
        { client: trx }
      )
    })
  }

  async regenerateBackupCodes(user: User, code: string): Promise<string[]> {
    if ((await this.verifyLogin(user, code)) === null) {
      throw new TwoFactorError('That code is not right')
    }
    return db.transaction((trx) => this.replaceBackupCodes(user.id, trx))
  }

  private async replaceBackupCodes(
    userId: string,
    trx: TransactionClientContract
  ): Promise<string[]> {
    await TwoFactorBackupCode.query({ client: trx }).where('userId', userId).delete()
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, newBackupCode)
    await TwoFactorBackupCode.createMany(
      codes.map((c) => ({ userId, codeHash: hashCode(normalise(c)) })),
      { client: trx }
    )
    return codes
  }
}
