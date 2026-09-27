import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import CityPageService from '#services/marketing/city_page_service'

const siteUrl = () => env.get('APP_URL').replace(/\/$/, '')

/** /cities and /cities/:slug — local 3D printing pages, published only with real supply (M2-T3). */
export default class CityPageController {
  async index({ inertia }: HttpContext) {
    const all = await new CityPageService().list()
    const pages = all.filter((c) => c.indexable)
    return inertia.render('cities/index', {
      cities: pages.map((c) => ({
        slug: c.slug,
        city: c.city,
        country: c.country,
        makers: c.makers,
      })),
      indexable: pages.length > 0,
      canonicalUrl: `${siteUrl()}/cities`,
    })
  }

  async show({ inertia, params, response }: HttpContext) {
    const page = await new CityPageService().find(params.slug)
    // a city without enough makers has no page at all: nothing real to say, nobody to single out
    if (!page || !page.indexable) return response.notFound()
    return inertia.render('cities/show', {
      city: {
        slug: page.slug,
        name: page.city,
        country: page.country,
        makers: page.makers!,
        materials: page.materials,
      },
      canonicalUrl: `${siteUrl()}/cities/${page.slug}`,
    })
  }
}
