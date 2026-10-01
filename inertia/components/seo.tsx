/* eslint-disable react/no-unknown-property -- `head-key` is Inertia's attribute for de-duplicating <head> tags */
import { Head, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useT } from '~/lib/i18n'

type JsonLd = Record<string, unknown>

export interface SeoProps {
  title: string
  description?: string
  /** Absolute canonical URL; defaults to the site URL + this page's path (no query string). */
  canonical?: string
  image?: { url: string; width?: number | null; height?: number | null; alt?: string }
  type?: 'website' | 'article' | 'product'
  noindex?: boolean
  /**
   * The page exists in both UI languages (?lang=en / ?lang=tr), so hreflang alternates are listed.
   * Off for content written in one language only (blog, glossary).
   */
  bilingual?: boolean
  /** Trail from the home page, e.g. [{ name: 'Materials', path: '/materials' }, { name: 'PETG' }]. */
  breadcrumbs?: Array<{ name: string; path?: string }>
  jsonLd?: JsonLd | JsonLd[]
  children?: ReactNode
}

const withLang = (url: string, lang: string) => `${url}${url.includes('?') ? '&' : '?'}lang=${lang}`

/** JSON for a <script type="application/ld+json">, safe to inline in HTML. */
const ldJson = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c')

/**
 * Everything a public page needs in <head> for search engines, AI crawlers and link previews:
 * title, description, canonical, hreflang (EN/TR via ?lang=), Open Graph + Twitter card with a
 * default share image, breadcrumbs and page JSON-LD. Pages are server-rendered, so crawlers read
 * all of this in the first HTML.
 */
export function Seo({
  title,
  description,
  canonical,
  image,
  type = 'website',
  noindex = false,
  bilingual = true,
  breadcrumbs,
  jsonLd,
  children,
}: SeoProps) {
  const { t, locale } = useT()
  const page = usePage<{ siteUrl: string }>()
  const site = page.props.siteUrl
  const path = page.url.split('?')[0]
  const base = canonical ?? `${site}${path === '/' ? '/' : path}`
  // the Turkish version of a bilingual page lives at ?lang=tr; English is the default URL
  const self = bilingual && locale === 'tr' ? withLang(base, 'tr') : base
  const shareImage = image ?? {
    url: `${site}/og/fabrmatch-${locale === 'tr' ? 'tr' : 'en'}.png`,
    width: 1200,
    height: 630,
    alt: t('Fabrmatch: custom 3D printing, made to order'),
  }
  const crumbs = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [{ name: t('Home'), path: '/' }, ...breadcrumbs].map((c, i) => ({
          '@type': 'ListItem',
          'position': i + 1,
          'name': c.name,
          ...(c.path ? { item: `${site}${c.path}` } : {}),
        })),
      }
    : null
  const graphs = [
    ...(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []),
    ...(crumbs ? [crumbs] : []),
  ]

  return (
    <Head title={title}>
      {description && <meta head-key="description" name="description" content={description} />}
      <link head-key="canonical" rel="canonical" href={self} />
      {noindex && <meta head-key="robots" name="robots" content="noindex, follow" />}
      {bilingual && <link head-key="hl-en" rel="alternate" hrefLang="en" href={base} />}
      {bilingual && (
        <link head-key="hl-tr" rel="alternate" hrefLang="tr" href={withLang(base, 'tr')} />
      )}
      {bilingual && <link head-key="hl-x" rel="alternate" hrefLang="x-default" href={base} />}
      <meta head-key="og:site_name" property="og:site_name" content="Fabrmatch" />
      <meta head-key="og:type" property="og:type" content={type} />
      <meta head-key="og:title" property="og:title" content={title} />
      {description && (
        <meta head-key="og:description" property="og:description" content={description} />
      )}
      <meta head-key="og:url" property="og:url" content={self} />
      <meta
        head-key="og:locale"
        property="og:locale"
        content={locale === 'tr' ? 'tr_TR' : 'en_US'}
      />
      <meta head-key="og:image" property="og:image" content={shareImage.url} />
      {shareImage.width && (
        <meta
          head-key="og:image:width"
          property="og:image:width"
          content={String(shareImage.width)}
        />
      )}
      {shareImage.height && (
        <meta
          head-key="og:image:height"
          property="og:image:height"
          content={String(shareImage.height)}
        />
      )}
      <meta head-key="og:image:alt" property="og:image:alt" content={shareImage.alt ?? title} />
      <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
      {graphs.map((g, i) => (
        <script
          key={i}
          head-key={`ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(g) }}
        />
      ))}
      {children}
    </Head>
  )
}
