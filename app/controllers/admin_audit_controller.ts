import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import AuditSearchService from '#services/admin/audit_search_service'

const validator = vine.create({
  action: vine.string().trim().maxLength(80).optional(),
  subjectType: vine.string().trim().maxLength(40).optional(),
  subjectId: vine.string().uuid().optional(),
  actorId: vine.string().uuid().optional(),
  from: vine.string().trim().maxLength(10).optional(),
  to: vine.string().trim().maxLength(10).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})

export default class AdminAuditController {
  async index({ inertia, request }: HttpContext) {
    const filters = await request.validateUsing(validator)
    const result = await new AuditSearchService().search(filters)
    return inertia.render('admin/audit/index', {
      ...result,
      filters: {
        action: filters.action ?? '',
        subjectType: filters.subjectType ?? '',
        subjectId: filters.subjectId?.toString() ?? '',
        actorId: filters.actorId?.toString() ?? '',
        from: filters.from ?? '',
        to: filters.to ?? '',
      },
    })
  }
}
