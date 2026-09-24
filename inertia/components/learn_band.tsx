import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '~/lib/format'
import { useT } from '~/lib/i18n'

export type HomeGuide = { slug: string; title: string; description: string; date: string }

const LINKS = [
  { href: '/glossary', label: 'Glossary of 3D printing terms' },
  { href: '/tools/quick-quote', label: 'Instant price tool' },
  { href: '/tools/maker-income', label: 'Maker income calculator' },
]

/** Real articles only; the guides are written in Turkish, so they are marked as such for every reader. */
export function LearnBand({ guides }: { guides: HomeGuide[] }) {
  const { t } = useT()
  if (guides.length === 0) return null
  return (
    <section className="border-t border-line bg-paper-sunken">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl font-display text-4xl font-semibold text-ink-900">
            {t('Learn before you print')}
          </h2>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-900 underline underline-offset-4"
          >
            {t('All guides (in Turkish)')} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/blog/${g.slug}`}
                lang="tr"
                className="flex h-full flex-col rounded-[10px] border border-line bg-paper-raised p-5 transition-colors hover:border-ink-900/40"
              >
                <time dateTime={g.date} className="font-mono text-xs text-ink-600">
                  {formatDate(g.date)}
                </time>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink-900">{g.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-700">{g.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-6 flex flex-wrap gap-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-md border border-line bg-paper-raised px-4 text-sm font-medium text-ink-900 hover:border-ink-900/40"
              >
                {t(l.label)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
