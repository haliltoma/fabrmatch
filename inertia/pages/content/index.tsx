import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'

type Entry = {
  slug: string
  title: string
  description: string
  date: string
}

const COPY = {
  blog: {
    title: 'Blog — Fabrmatch',
    heading: 'Blog',
    intro: '3B baskı, fiyatlandırma ve stoksuz satış üzerine pratik rehberler.',
    base: '/blog',
  },
  glossary: {
    title: 'Sözlük — Fabrmatch',
    heading: 'Sözlük',
    intro: '3B baskıda sık geçen terimlerin kısa açıklamaları.',
    base: '/glossary',
  },
} as const

export default function ContentIndex({
  kind,
  entries,
  canonicalUrl,
}: {
  kind: 'blog' | 'glossary'
  entries: Entry[]
  canonicalUrl: string
}) {
  const copy = COPY[kind]
  return (
    <>
      <Head title={copy.title}>
        <meta name="description" content={copy.intro} />
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink-900">{copy.heading}</h1>
        <p className="mt-2 text-ink-700">{copy.intro}</p>
        <ul className="mt-8 divide-y divide-line">
          {entries.map((e) => (
            <li key={e.slug} className="py-4">
              <Link
                href={`${copy.base}/${e.slug}`}
                className="font-display text-lg font-semibold text-ink-900 hover:underline"
              >
                {e.title}
              </Link>
              <p className="mt-1 text-sm text-ink-700">{e.description}</p>
              {kind === 'blog' && <p className="mt-1 font-mono text-xs text-ink-600">{e.date}</p>}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
