import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import User from '#models/user'
import UserSessionService from '#services/identity/user_session_service'
import { pageMeta, pageParams } from '#services/pagination'

export class UserAdminError extends DomainError {}

export interface UserSearch {
  q?: string
  role?: 'seller' | 'manufacturer' | 'admin'
  suspended?: boolean
  page?: number
}

export default class UserAdminService {
  async search(filters: UserSearch) {
    const { page, perPage } = pageParams({ page: filters.page })
    const query = User.query().preload('roles').orderBy('id', 'desc')
    const q = filters.q?.trim()
    if (q) {
      const like = `%${q.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`
      query.where((w) => w.whereILike('email', like).orWhereILike('fullName', like))
    }
    if (filters.role) {
      query.whereExists((sub) =>
        sub
          .from('user_roles')
          .whereColumn('user_roles.user_id', 'users.id')
          .where('user_roles.role', filters.role!)
      )
    }
    if (filters.suspended === true) query.whereNotNull('suspendedAt')
    if (filters.suspended === false) query.whereNull('suspendedAt')

    const paginator = await query.paginate(page, perPage)
    return {
      rows: paginator.all().map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        roles: u.roles.map((r) => r.role),
        emailVerified: !!u.emailVerifiedAt,
        twoFactor: !!u.twoFactorEnabledAt,
        suspendedAt: u.suspendedAt?.toISO() ?? null,
        suspensionReason: u.suspensionReason,
        createdAt: u.createdAt.toISO(),
      })),
      meta: pageMeta(paginator.total, page, perPage),
    }
  }

  /** Blocks sign-in and ends every session. Orders already in flight are handled from the queues. */
  async suspend(userId: string, reason: string, adminId: string) {
    const text = reason.trim()
    if (text.length < 5) throw new UserAdminError('Give a reason (at least 5 characters)')
    if (userId === adminId) throw new UserAdminError('You cannot suspend yourself')

    await db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', userId).forUpdate().first()
      if (!user) throw new UserAdminError('User not found')
      if (user.suspendedAt) throw new UserAdminError('This account is already suspended')
      user.suspendedAt = DateTime.now()
      user.suspensionReason = text
      await user.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'user.suspended',
          subjectType: 'user',
          subjectId: userId,
          meta: { reason: text },
        },
        { client: trx }
      )
    })
    await new UserSessionService().revokeAll(userId)
  }

  async unsuspend(userId: string, adminId: string) {
    await db.transaction(async (trx) => {
      const user = await User.query({ client: trx }).where('id', userId).forUpdate().first()
      if (!user) throw new UserAdminError('User not found')
      if (!user.suspendedAt) throw new UserAdminError('This account is not suspended')
      user.suspendedAt = null
      user.suspensionReason = null
      await user.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'user.unsuspended',
          subjectType: 'user',
          subjectId: userId,
          meta: {},
        },
        { client: trx }
      )
    })
  }
}
