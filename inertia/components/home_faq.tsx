import { useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, MessageCircleQuestion, Plus } from 'lucide-react'
import { useT } from '~/lib/i18n'

export type FaqItem = { category: string; q: string; a: string }
export type FaqParams = Record<string, string | number>

export const FAQ_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'ordering', label: 'Ordering' },
  { id: 'payment', label: 'Payment' },
  { id: 'problems', label: 'If something goes wrong' },
  { id: 'privacy', label: 'Files and privacy' },
  { id: 'selling', label: 'Selling' },
  { id: 'making', label: 'Printing for Fabrmatch' },
]

/** One answered question; <details> keeps every answer in the page for search engines and no-JS. */
export function FaqEntry({ item, params }: { item: FaqItem; params: FaqParams }) {
  const { t } = useT()
  return (
    <details className="group px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 marker:hidden">
        {t(item.q)}
        <Plus
          className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <p className="mt-2 max-w-2xl text-ink-700">{t(item.a, params)}</p>
    </details>
  )
}

/** FAQPage structured data in the visitor's language (the same text as on the page). */
export function faqJsonLd(
  faq: FaqItem[],
  params: FaqParams,
  t: (s: string, p?: FaqParams) => string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faq.map((item) => ({
      '@type': 'Question',
      'name': t(item.q),
      'acceptedAnswer': { '@type': 'Answer', 'text': t(item.a, params) },
    })),
  }
}

/**
 * The home page's questions, wide: topics on the left (filter + a way to ask a person), answers on
 * the right grouped by topic. Every answer stays in the DOM whichever topic is picked.
 */
export function HomeFaq({ faq, params }: { faq: FaqItem[]; params: FaqParams }) {
  const { t } = useT()
  const [topic, setTopic] = useState<string>('all')
  if (faq.length === 0) return null
  const groups = FAQ_CATEGORIES.map((c) => ({
    ...c,
    items: faq.filter((f) => f.category === c.id),
  })).filter((g) => g.items.length > 0)

  return (
    <section aria-labelledby="home-faq-h" className="border-t border-line bg-paper-raised">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[20rem_1fr] lg:gap-16 lg:px-8">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2
            id="home-faq-h"
            className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink-900 sm:text-5xl"
          >
            {t('Questions, answered')}
          </h2>
          <p className="mt-4 text-lg text-ink-700">
            {t('What people ask before their first order, and the plain answer.')}
          </p>

          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t('Topics')}>
            {[{ id: 'all', label: 'All' }, ...groups].map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={topic === g.id}
                onClick={() => setTopic(g.id)}
                className={`min-h-9 cursor-pointer rounded-full border-2 px-3 text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  topic === g.id
                    ? 'border-ink-900 bg-ink-900 text-paper'
                    : 'border-line bg-paper text-ink-800 hover:border-ink-900'
                }`}
              >
                {t(g.label)}
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-[10px] border-2 border-ink-900 bg-paper p-5">
            <p className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <MessageCircleQuestion className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              {t('Still wondering?')}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {t('Write to us and a person answers by e-mail.')}
            </p>
            <Link
              href="/help"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-900 underline underline-offset-4"
            >
              {t('Ask a question')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="space-y-10">
          {groups.map((g) => (
            <div key={g.id} hidden={topic !== 'all' && topic !== g.id}>
              <h3 className="font-mono text-xs font-semibold tracking-widest text-ink-600 uppercase">
                {t(g.label)}
              </h3>
              <div className="mt-3 divide-y-2 divide-ink-900/10 rounded-[10px] border-2 border-ink-900 bg-paper">
                {g.items.map((item) => (
                  <FaqEntry key={item.q} item={item} params={params} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
