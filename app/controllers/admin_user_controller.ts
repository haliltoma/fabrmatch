import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import UserAdminService from '#services/admin/user_admin_service'

const searchValidator = vine.create({
  q: vine.string().trim().maxLength(100).optional(),
  role: vine.enum(['seller', 'manufacturer', 'admin'] as const).optional(),
  suspended: vine.enum(['yes', 'no'] as const).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})
const suspendValidator = vine.create({ reason: vine.string().trim().maxLength(300) })

export default class AdminUserController {
  async index({ inertia, request }: HttpContext) {
    const filters = await request.validateUsing(searchValidator)
    const result = await new UserAdminService().search({
      q: filters.q,
      role: filters.role,
      suspended: filters.suspended === undefined ? undefined : filters.suspended === 'yes',
      page: filters.page,
    })
    return inertia.render('admin/users/index', {
      ...result,
      filters: {
        q: filters.q ?? '',
        role: filters.role ?? '',
        suspended: filters.suspended ?? '',
      },
    })
  }

  async suspend({ params, request, response, session, auth }: HttpContext) {
    const { reason } = await request.validateUsing(suspendValidator)
    await new UserAdminService().suspend(params.id, reason, auth.getUserOrFail().id)
    session.flash('success', 'Account suspended and signed out everywhere.')
    return response.redirect().back()
  }

  async unsuspend({ params, response, session, auth }: HttpContext) {
    await new UserAdminService().unsuspend(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Account restored.')
    return response.redirect().back()
  }
}
