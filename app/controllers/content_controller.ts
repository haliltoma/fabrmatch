import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import ContentService, { type ContentKind } from '#services/content/content_service'

const siteUrl = () => env.get('APP_URL').replace(/\/$/, '')

export default class ContentController {
  private service = new ContentService()

  async blogIndex({ inertia }: HttpContext) {
    return inertia.render('content/index', {
      kind: 'blog' as const,
      entries: await this.service.list('blog'),
      canonicalUrl: `${siteUrl()}/blog`,
    })
  }

  async blogShow(ctx: HttpContext) {
    return this.show(ctx, 'blog')
  }

  async glossaryIndex({ inertia }: HttpContext) {
    return inertia.render('content/index', {
      kind: 'glossary' as const,
      entries: await this.service.list('glossary'),
      canonicalUrl: `${siteUrl()}/glossary`,
    })
  }

  async glossaryShow(ctx: HttpContext) {
    return this.show(ctx, 'glossary')
  }

  private async show({ inertia, params, response }: HttpContext, kind: ContentKind) {
    const entry = await this.service.find(kind, params.slug)
    if (!entry) return response.notFound()
    const canonicalUrl = `${siteUrl()}/${kind}/${entry.slug}`
    const jsonLd =
      kind === 'blog'
        ? {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': entry.title,
            'description': entry.description,
            'datePublished': entry.date,
            'mainEntityOfPage': canonicalUrl,
            'publisher': { '@type': 'Organization', 'name': 'Fabrmatch' },
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'DefinedTerm',
            'name': entry.title,
            'description': entry.description,
            'url': canonicalUrl,
          }
    const sectionName = kind === 'blog' ? 'Blog' : 'Sözlük'
    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Fabrmatch', 'item': `${siteUrl()}/` },
        { '@type': 'ListItem', 'position': 2, 'name': sectionName, 'item': `${siteUrl()}/${kind}` },
        { '@type': 'ListItem', 'position': 3, 'name': entry.title, 'item': canonicalUrl },
      ],
    }
    return inertia.render('content/show', {
      entry,
      canonicalUrl,
      jsonLd: JSON.stringify([jsonLd, breadcrumbs]).replaceAll('<', '\\u003c'),
    })
  }
}
