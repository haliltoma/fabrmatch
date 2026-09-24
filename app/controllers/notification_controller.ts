import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import NotificationService from '#services/notifications/notification_service'
import { requestLocale } from '#services/i18n/request_locale'
import { NOTIFICATION_TYPES } from '#services/notifications/catalog'
import { pageQueryValidator } from '#validators/order'

const preferenceValidator = vine.create({
  type: vine.enum(NOTIFICATION_TYPES),
  email: vine.boolean(),
})

export default class NotificationController {
  async index(ctx: HttpContext) {
    const { inertia, auth, request } = ctx
    const locale = requestLocale(ctx)
    const service = new NotificationService()
    const { page } = await request.validateUsing(pageQueryValidator)
    const { rows, meta } = await service.list(auth.getUserOrFail().id, { page })
    return inertia.render('notifications/index', {
      meta,
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        ...service.localised(n, locale),
        link: String(n.data.link ?? '/'),
        read: n.readAt !== null,
        createdAt: n.createdAt.toISO(),
      })),
    })
  }

  /** Marks one notification read and follows its link. */
  async open({ auth, params, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const service = new NotificationService()
    const { rows } = await service.list(userId, { page: 1 })
    const target = rows.find((n) => n.id === Number(params.id))
    await service.markRead(userId, Number(params.id))
    return response
      .redirect()
      .toPath(target ? String(target.data.link ?? '/notifications') : '/notifications')
  }

  async readAll({ auth, response }: HttpContext) {
    await new NotificationService().markAllRead(auth.getUserOrFail().id)
    return response.redirect().back()
  }

  async preferences({ inertia, auth }: HttpContext) {
    const email = await new NotificationService().emailPreferences(auth.getUserOrFail().id)
    return inertia.render('notifications/preferences', {
      types: NOTIFICATION_TYPES.map((type) => ({ type, email: email[type] })),
    })
  }

  async updatePreference({ request, auth, response, session }: HttpContext) {
    const { type, email } = await request.validateUsing(preferenceValidator)
    await new NotificationService().setEmailPreference(auth.getUserOrFail().id, type, email)
    session.flash('success', 'Preference saved.')
    return response.redirect().back()
  }
}
