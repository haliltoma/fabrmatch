import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ContentReportService, { REPORT_REASONS } from '#services/admin/content_report_service'

const validator = vine.create({
  reason: vine.enum(REPORT_REASONS),
  details: vine.string().trim().maxLength(500).optional(),
})

export default class ContentReportController {
  async store({ params, request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(validator)
    await new ContentReportService().report(auth.getUserOrFail().id, {
      sellerProductId: Number(params.id),
      ...data,
    })
    session.flash('success', 'Thank you — our team will review this listing.')
    return response.redirect().back()
  }
}
