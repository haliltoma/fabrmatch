import type { HttpContext } from '@adonisjs/core/http'
import LegalService, { LEGAL_DOCS } from '#services/legal/legal_service'
import { requestLocale } from '#services/i18n/request_locale'

export default class LegalController {
  async show(ctx: HttpContext) {
    const { inertia, params, response } = ctx
    const service = new LegalService()
    const doc = service.find(params.slug)
    const html = await service.html(params.slug, requestLocale(ctx))
    if (!doc || !html) return response.notFound()
    return inertia.render('legal/show', {
      title: doc.title,
      version: doc.version,
      html,
      docs: LEGAL_DOCS.map((d) => ({ slug: d.slug, title: d.title })),
    })
  }
}
