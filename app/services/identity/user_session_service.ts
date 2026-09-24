import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import UserSession from '#models/user_session'

const TOUCH_AFTER_MINUTES = 5
const MAX_LISTED = 20

/**
 * Server-side record of each login, independent of the session store (cookie or database), so a
 * user can see where they are signed in and cut a session off. The session itself only carries the id.
 */
export default class UserSessionService {
  async start(
    userId: number,
    meta: { ip: string | null; userAgent: string | null }
  ): Promise<string> {
    const session = await UserSession.create({
      id: randomUUID(),
      userId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      lastSeenAt: DateTime.now(),
    })
    return session.id
  }

  /** True while the session may be used. Refreshes last-seen, but not on every request. */
  async check(sessionId: string, userId: number): Promise<boolean> {
    const session = await UserSession.query()
      .where('id', sessionId)
      .where('userId', userId)
      .whereNull('revokedAt')
      .first()
    if (!session) return false
    if (session.lastSeenAt < DateTime.now().minus({ minutes: TOUCH_AFTER_MINUTES })) {
      session.lastSeenAt = DateTime.now()
      await session.save()
    }
    return true
  }

  async list(userId: number) {
    const rows = await UserSession.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .orderBy('lastSeenAt', 'desc')
      .limit(MAX_LISTED)
    return rows.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      device: describeDevice(s.userAgent),
      lastSeenAt: s.lastSeenAt.toISO(),
      createdAt: s.createdAt.toISO(),
    }))
  }

  async revoke(userId: number, sessionId: string): Promise<boolean> {
    const revoked = await UserSession.query()
      .where('id', sessionId)
      .where('userId', userId)
      .whereNull('revokedAt')
      .update({ revokedAt: DateTime.now().toSQL() })
      .returning('id')
    return revoked.length > 0
  }

  /** Everything except the session the user is on right now (or everything when `keep` is null). */
  async revokeAll(userId: number, keep: string | null = null): Promise<number> {
    const query = UserSession.query().where('userId', userId).whereNull('revokedAt')
    if (keep) query.whereNot('id', keep)
    const revoked = await query.update({ revokedAt: DateTime.now().toSQL() }).returning('id')
    return revoked.length
  }
}

export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser'
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : ''
  return os ? `${browser} on ${os}` : browser
}
