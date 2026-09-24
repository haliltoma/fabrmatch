import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { useT } from '~/lib/i18n'

type Entry = {
  slug: string
  title: string
  description: string
  date: string
  kind: string
  html: string
}

export default function ContentShow({
  entry,
  canonicalUrl,
  jsonLd,
}: {
  entry: Entry
  canonicalUrl: string
  jsonLd: string
}) {
  const { t } = useT()

  const isBlog = entry.kind === 'blog'
  return (
    <>
      <Head title={`${entry.title} — Fabrmatch`}>
        <meta name="description" content={entry.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={entry.title} />
        <meta property="og:description" content={entry.description} />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>
      <article className="mx-auto max-w-2xl px-4 py-12">
        <Link
          href={isBlog ? '/blog' : '/glossary'}
          className="text-sm text-ink-700 hover:underline"
        >
          ← {isBlog ? t('Tüm yazılar') : t('Tüm terimler')}
        </Link>
        {isBlog && <p className="mt-4 font-mono text-xs text-ink-600">{entry.date}</p>}
        <div
          className="mt-2 space-y-4 text-ink-800 [&_a]:font-medium [&_a]:text-ink-900 [&_a]:underline [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
      </article>
    </>
  )
}
