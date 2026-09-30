import { Link } from '@adonisjs/inertia/react'
import { formatPrice } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { Seo } from '~/components/seo'

type Props = {
  useCases: Array<{
    slug: string
    title: string
    summary: string
    fromMinor: number
    currency: string
  }>
  indexable: boolean
  canonicalUrl: string
}

export default function UseCaseIndex({ useCases, indexable, canonicalUrl }: Props) {
  const { t } = useT()
  return (
    <>
      <Seo
        title={t('What people print with Fabrmatch')}
        description={t(
          'Prototypes, spare parts and small batches: how each works, and what it costs today.'
        )}
        canonical={canonicalUrl}
        noindex={!indexable}
        breadcrumbs={[{ name: t('Use cases') }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('What people print with Fabrmatch')}
        </h1>
        <p className="mt-2 text-lg text-ink-700">
          {t('Prototypes, spare parts and small batches: how each works, and what it costs today.')}
        </p>
        <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {useCases.map((u) => (
            <li key={u.slug}>
              <Link
                href={`/use-cases/${u.slug}`}
                className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 hover:bg-paper-sunken"
              >
                <span>
                  <span className="block font-display text-xl font-semibold text-ink-900">
                    {t(u.title)}
                  </span>
                  <span className="text-ink-700">{t(u.summary)}</span>
                </span>
                <span className="tabular text-sm text-ink-700">
                  {t('from {price} a piece', { price: formatPrice(u.fromMinor, u.currency) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
