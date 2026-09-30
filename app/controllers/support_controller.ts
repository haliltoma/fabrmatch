import type { HttpContext } from '@adonisjs/core/http'
import { FAQ, faqParams } from '#services/support/faq'
import vine from '@vinejs/vine'
import SupportService, { SUPPORT_TOPICS } from '#services/support/support_service'

const validator = vine.create({
  email: vine.string().trim().maxLength(254),
  topic: vine.enum(SUPPORT_TOPICS),
  orderCode: vine.string().trim().maxLength(20).optional(),
  message: vine.string().trim().maxLength(2000),
})

export default class SupportController {
  async help({ inertia, auth }: HttpContext) {
    return inertia.render('support/help', {
      faq: FAQ,
      faqParams: faqParams(),
      topics: [...SUPPORT_TOPICS],
      email: auth.user?.email ?? '',
    })
  }

  async submit({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(validator)
    await new SupportService().submit({ userId: auth.user?.id ?? null, ...data })
    session.flash('success', 'Thanks — we have your message and will reply by e-mail.')
    return response.redirect().back()
  }
}
