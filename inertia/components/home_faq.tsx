import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, Plus } from 'lucide-react'
import { useT } from '~/lib/i18n'

/** The questions that stop people ordering, answered before the last call to action. */
export function HomeFaq({ faq }: { faq: Array<{ q: string; a: string }> }) {
  const { t } = useT()
  if (faq.length === 0) return null
  return (
    <section aria-labelledby="home-faq-h" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="home-faq-h" className="font-display text-4xl font-semibold text-ink-900">
          {t('Before you ask')}
        </h2>
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-900 underline underline-offset-4"
        >
          {t('All questions')} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-6 divide-y-2 divide-ink-900/10 rounded-[14px] border-2 border-ink-900 bg-paper-raised">
        {faq.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 marker:hidden">
              {t(item.q)}
              <Plus
                className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <p className="mt-2 text-ink-700">{t(item.a)}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
