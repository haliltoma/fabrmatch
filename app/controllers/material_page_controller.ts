import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import ContentService from '#services/content/content_service'
import MaterialPageService from '#services/marketing/material_page_service'

const siteUrl = () => env.get('APP_URL').replace(/\/$/, '')

export default class MaterialPageController {
  async index({ inertia }: HttpContext) {
    const pages = await new MaterialPageService().list()
    return inertia.render('materials/index', {
      materials: pages.map((m) => ({
        slug: m.slug,
        name: m.name,
        technology: m.technology,
        makers: m.makers,
      })),
      indexable: pages.some((m) => m.indexable),
      canonicalUrl: `${siteUrl()}/materials`,
    })
  }

  async show({ inertia, params, response }: HttpContext) {
    const page = await new MaterialPageService().find(params.slug)
    if (!page) return response.notFound()
    const editorial = await new ContentService().find('materials', page.slug)
    return inertia.render('materials/show', {
      material: {
        slug: page.slug,
        name: page.name,
        technology: page.technology,
        makers: page.makers,
        rate: page.rate,
      },
      html: editorial?.html ?? null,
      description: editorial?.description ?? `${page.name} (${page.technology}) 3D printing`,
      indexable: page.indexable && editorial !== null,
      canonicalUrl: `${siteUrl()}/materials/${page.slug}`,
    })
  }
}
