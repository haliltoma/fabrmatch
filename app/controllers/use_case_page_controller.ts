import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import ContentService from '#services/content/content_service'
import UseCaseService from '#services/marketing/use_case_service'

const siteUrl = () => env.get('APP_URL').replace(/\/$/, '')

export default class UseCasePageController {
  async index({ inertia }: HttpContext) {
    const pages = await new UseCaseService().list()
    return inertia.render('use_cases/index', {
      useCases: pages.map((u) => ({
        slug: u.slug,
        title: u.title,
        summary: u.summary,
        fromMinor: Math.min(...u.prices.map((p) => p.perPieceMinor)),
        currency: u.currency,
      })),
      indexable: pages.some((u) => u.indexable),
      canonicalUrl: `${siteUrl()}/use-cases`,
    })
  }

  async show({ inertia, params, response }: HttpContext) {
    const page = await new UseCaseService().find(params.slug)
    if (!page) return response.notFound()
    const editorial = await new ContentService().find('use-cases', page.slug)
    return inertia.render('use_cases/show', {
      useCase: page,
      html: editorial?.html ?? null,
      description: editorial?.description ?? page.summary,
      indexable: page.indexable && editorial !== null,
      canonicalUrl: `${siteUrl()}/use-cases/${page.slug}`,
    })
  }
}
