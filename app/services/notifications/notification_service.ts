import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import User from '#models/user'
import NotificationMail from '#mails/notification_mail'
import { isLocale, type Locale } from '#services/i18n/locale'
import Notification from '#models/notification'
import NotificationPreference from '#models/notification_preference'
import {
  NOTIFICATION_TYPES,
  render,
  type NotificationContext,
  type NotificationRole,
  type NotificationType,
} from '#services/notifications/catalog'
import { pageMeta, pageParams } from '#services/pagination'

export interface NotifyInput {
  userId: number
  type: NotificationType
  role: NotificationRole
  context: NotificationContext
  /** Same key for the same user = same event = no duplicate. */
  eventKey: string
}

export default class NotificationService {
  /**
   * Creates the in-app notification (idempotent on `userId + eventKey`) and queues the e-mail.
   * Never throws: a notification problem must not break the business action that caused it.
   */
  async notify(input: NotifyInput): Promise<Notification | null> {
    try {
      const rendered = render(input.type, input.role, input.context)
      if (!rendered) return null

      const inserted = await db
        .table('notifications')
        .insert({
          user_id: input.userId,
          type: input.type,
          title: rendered.title,
          body: rendered.body,
          data: JSON.stringify({
            link: rendered.link,
            orderId: input.context.orderId ?? null,
            role: input.role,
            ctx: input.context,
          }),
          event_key: input.eventKey,
          created_at: new Date(),
        })
        .onConflict(['user_id', 'event_key'])
        .ignore()
        .returning('id')
      if (inserted.length === 0) return null

      const notification = await Notification.findOrFail(inserted[0].id)
      await this.queueEmail(notification)
      await this.broadcast(notification)
      return notification
    } catch (error) {
      logger.error({ msg: 'notify failed', type: input.type, error: (error as Error).message })
      return null
    }
  }

  /** Sends the e-mail for one notification. Idempotent; skipped when opted out or already sent. */
  async sendEmail(notificationId: number): Promise<boolean> {
    const notification = await Notification.find(notificationId)
    if (!notification || notification.emailedAt) return false
    if (!(await this.wantsEmail(notification.userId, notification.type as NotificationType))) {
      return false
    }
    const user = await User.find(notification.userId)
    if (!user) return false

    const base = env.get('APP_URL').replace(/\/$/, '')
    const link = String(notification.data.link ?? '/')
    const locale: Locale = isLocale(user.locale) ? user.locale : 'en'
    const text = this.localised(notification, locale)
    await mail.send(
      new NotificationMail({
        to: user.email,
        locale,
        title: text.title,
        body: text.body,
        url: `${base}${link}`,
        preferencesUrl: `${base}/notifications/preferences`,
      })
    )
    notification.emailedAt = DateTime.now()
    await notification.save()
    return true
  }

  /** Title and body in the reader's language; rows written before contexts were stored stay as saved. */
  localised(notification: Notification, locale: Locale): { title: string; body: string } {
    const { role, ctx } = notification.data as {
      role?: NotificationRole
      ctx?: NotificationContext
    }
    if (locale !== 'en' && role && ctx) {
      const rendered = render(notification.type as NotificationType, role, ctx, locale)
      if (rendered) return { title: rendered.title, body: rendered.body }
    }
    return { title: notification.title, body: notification.body }
  }

  private async queueEmail(notification: Notification) {
    if (app.inTest) return // tests call SendNotificationEmail directly
    try {
      const { default: SendNotificationEmail } = await import('#jobs/send_notification_email')
      await SendNotificationEmail.dispatch({ notificationId: notification.id })
    } catch (error) {
      logger.error({ msg: 'could not queue notification e-mail', error: (error as Error).message })
    }
  }

  private async broadcast(notification: Notification) {
    if (app.inTest) return
    try {
      const { default: transmit } = await import('@adonisjs/transmit/services/main')
      transmit.broadcast(`users/${notification.userId}/notifications`, {
        id: notification.id,
        title: notification.title,
      })
    } catch (error) {
      logger.error({ msg: 'notification broadcast failed', error: (error as Error).message })
    }
  }

  async unreadCount(userId: number): Promise<number> {
    const row = await Notification.query()
      .where('userId', userId)
      .whereNull('readAt')
      .count('* as n')
      .first()
    return Number(row?.$extras.n ?? 0)
  }

  async list(userId: number, params: { page?: number } = {}) {
    const { page, perPage } = pageParams(params)
    const paginator = await Notification.query()
      .where('userId', userId)
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    return { rows: paginator.all(), meta: pageMeta(paginator.total, page, perPage) }
  }

  async markRead(userId: number, notificationId: number): Promise<void> {
    await Notification.query()
      .where('id', notificationId)
      .where('userId', userId)
      .whereNull('readAt')
      .update({ readAt: DateTime.now().toSQL() })
  }

  async markAllRead(userId: number): Promise<void> {
    await Notification.query()
      .where('userId', userId)
      .whereNull('readAt')
      .update({ readAt: DateTime.now().toSQL() })
  }

  /** Types the user receives by e-mail (default: all). */
  async emailPreferences(userId: number): Promise<Record<NotificationType, boolean>> {
    const rows = await NotificationPreference.query().where('userId', userId)
    const map = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])) as Record<
      NotificationType,
      boolean
    >
    for (const row of rows) {
      if ((NOTIFICATION_TYPES as readonly string[]).includes(row.type)) {
        map[row.type as NotificationType] = row.email
      }
    }
    return map
  }

  async setEmailPreference(userId: number, type: NotificationType, email: boolean) {
    const existing = await NotificationPreference.query()
      .where('userId', userId)
      .where('type', type)
      .first()
    if (existing) {
      existing.email = email
      await existing.save()
    } else {
      await NotificationPreference.create({ userId, type, email })
    }
  }

  async wantsEmail(userId: number, type: NotificationType): Promise<boolean> {
    const pref = await NotificationPreference.query()
      .where('userId', userId)
      .where('type', type)
      .first()
    return pref ? pref.email : true
  }
}
