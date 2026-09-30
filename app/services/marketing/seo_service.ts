import env from '#start/env'
import fabrmatchConfig from '#config/fabrmatch'
import ContentService from '#services/content/content_service'
import CityPageService from '#services/marketing/city_page_service'
import MaterialPageService from '#services/marketing/material_page_service'
import UseCaseService from '#services/marketing/use_case_service'
import StorefrontService from '#services/storefront/storefront_service'
import { FAQ, faqParams } from '#services/support/faq'

/** Signed-in or machine-only areas that must never be indexed. */
export const PRIVATE_PREFIXES = [
  '/admin',
  '/maker',
  '/seller',
  '/orders',
  '/files',
  '/cart',
  '/account',
  '/notifications',
  '/messages',
  '/invoices',
  '/onboarding',
  '/disputes',
  '/rfqs',
  '/dev',
  '/api',
  '/webhooks',
]

interface SitemapUrl {
  path: string
  lastmod?: string
  /** Served in both UI languages (?lang=tr); false for one-language content (blog, glossary). */
  bilingual: boolean
}

const xml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/**
 * What search engines and AI crawlers read about the site: the sitemap (with EN/TR hreflang
 * alternates), robots.txt, and llms.txt, a plain-text brief for AI assistants
 * (https://llmstxt.org). Pages that are noindex for thin data are left out, as before.
 */
export default class SeoService {
  base() {
    return env.get('APP_URL').replace(/\/$/, '')
  }

  async sitemapUrls(): Promise<SitemapUrl[]> {
    const content = new ContentService()
    const [entries, posts, terms, materials, cities, useCases] = await Promise.all([
      new StorefrontService().sitemapEntries(),
      content.list('blog'),
      content.list('glossary'),
      new MaterialPageService().list(),
      new CityPageService().list(),
      new UseCaseService().list(),
    ])
    const indexableMaterials = materials.filter((m) => m.indexable)
    const indexableCities = cities.filter((c) => c.indexable)
    const indexableUseCases = useCases.filter((u) => u.indexable)
    const ui = (path: string, lastmod?: string): SitemapUrl => ({ path, lastmod, bilingual: true })
    return [
      ui('/'),
      ui('/shop'),
      ui('/tools/quick-quote'),
      ui('/for-sellers'),
      ui('/for-makers'),
      ui('/tools/maker-income'),
      ui('/help'),
      { path: '/blog', bilingual: false },
      { path: '/glossary', bilingual: false },
      ...(indexableMaterials.length > 0 ? [ui('/materials')] : []),
      ...indexableMaterials.map((m) => ui(`/materials/${m.slug}`)),
      ...(indexableCities.length > 0 ? [ui('/cities')] : []),
      ...indexableCities.map((c) => ui(`/cities/${c.slug}`)),
      ...(indexableUseCases.length > 0 ? [ui('/use-cases')] : []),
      ...indexableUseCases.map((u) => ui(`/use-cases/${u.slug}`)),
      ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.date, bilingual: false })),
      ...terms.map((t) => ({ path: `/glossary/${t.slug}`, lastmod: t.date, bilingual: false })),
      ...entries.map((e) => ui(`/shop/${e.id}/${e.slug}`, e.updatedAt)),
    ]
  }

  /** Every language version is its own <url>, each listing all versions (Google's hreflang rule). */
  async sitemapXml() {
    const base = this.base()
    const urls = await this.sitemapUrls()
    const body = urls.flatMap((u) => {
      const en = `${base}${u.path}`
      const lastmod = u.lastmod ? `<lastmod>${xml(u.lastmod)}</lastmod>` : ''
      if (!u.bilingual) return [`<url><loc>${xml(en)}</loc>${lastmod}</url>`]
      const tr = `${en}?lang=tr`
      const alternates = [
        `<xhtml:link rel="alternate" hreflang="en" href="${xml(en)}"/>`,
        `<xhtml:link rel="alternate" hreflang="tr" href="${xml(tr)}"/>`,
        `<xhtml:link rel="alternate" hreflang="x-default" href="${xml(en)}"/>`,
      ].join('')
      return [en, tr].map((loc) => `<url><loc>${xml(loc)}</loc>${lastmod}${alternates}</url>`)
    })
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body.join('')}</urlset>`
  }

  robotsTxt() {
    return [
      '# Search engines and AI answer engines (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,',
      '# Google-Extended, Bingbot...) may read every public page so they can cite it.',
      'User-agent: *',
      'Allow: /',
      ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`),
      '',
      `Sitemap: ${this.base()}/sitemap.xml`,
      `# A plain-text brief for AI assistants: ${this.base()}/llms.txt`,
      '',
    ].join('\n')
  }

  /** llms.txt: who we are, the rules that matter to a buyer, and the pages worth reading. */
  async llmsTxt() {
    const base = this.base()
    const params = faqParams()
    const fill = (s: string) =>
      s.replace(/\{(\w+)\}/g, (_, k: string) =>
        String(params[k as keyof typeof params] ?? `{${k}}`)
      )
    const [posts, materials, useCases] = await Promise.all([
      new ContentService().list('blog'),
      new MaterialPageService().list(),
      new UseCaseService().list(),
    ])
    const days = fabrmatchConfig.orders.autoConfirmDays
    return [
      '# Fabrmatch',
      '',
      `> Fabrmatch is a made-to-order 3D printing marketplace in Türkiye. Upload a 3D model (STL, 3MF or OBJ) or pick a ready design, see the delivered price at once without an account, and a verified maker nearby prints and ships it. The payment is held by Fabrmatch until the part is delivered; the buyer then has ${days} days to confirm or open a dispute.`,
      '',
      'Three ways to use it:',
      '- Buyers get parts printed without owning a printer.',
      '- Sellers list ready designs with their own margin; each order is printed and shipped for them, with no stock.',
      '- Makers (printer owners) receive paid jobs that fit their printers, materials and free hours.',
      '',
      '## Start here',
      `- [Instant 3D print price](${base}/tools/quick-quote): upload a model and see the delivered price, no account`,
      `- [Shop](${base}/shop): ready designs printed on demand`,
      `- [For sellers](${base}/for-sellers): sell 3D printed products without stock or a printer`,
      `- [For makers](${base}/for-makers): earn with your 3D printer`,
      `- [Maker income calculator](${base}/tools/maker-income)`,
      `- [Help and FAQ](${base}/help)`,
      '',
      '## Materials',
      ...materials
        .filter((m) => m.indexable)
        .map((m) => `- [${m.name}](${base}/materials/${m.slug}): ${m.technology}`),
      '',
      '## Use cases',
      ...useCases
        .filter((u) => u.indexable)
        .map((u) => `- [${u.title}](${base}/use-cases/${u.slug}): ${u.summary}`),
      '',
      '## Guides (Turkish)',
      ...posts.map((p) => `- [${p.title}](${base}/blog/${p.slug}): ${p.description}`),
      '',
      '## Frequently asked questions',
      ...FAQ.flatMap((f) => [`### ${f.q}`, fill(f.a), '']),
      '## Languages',
      `Every page is available in English and Turkish; add ?lang=tr for Turkish (for example ${base}/?lang=tr).`,
      '',
    ].join('\n')
  }
}
