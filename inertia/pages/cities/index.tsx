import { Link } from '@adonisjs/inertia/react'
import { useT } from '~/lib/i18n'
import { Seo } from '~/components/seo'

type City = { slug: string; city: string; country: string; makers: number | null }

export default function Cities({
  cities,
  indexable,
  canonicalUrl,
}: {
  cities: City[]
  indexable: boolean
  canonicalUrl: string
}) {
  const { t } = useT()
  return (
    <>
      <Seo
        title={t('3D printing near you — Fabrmatch')}
        description={t('Cities where local makers print your parts, and how many there are.')}
        canonical={canonicalUrl}
        noindex={!indexable}
        breadcrumbs={[{ name: t('Cities') }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('3D printing near you')}
        </h1>
        <p className="mt-2 text-ink-700">
          {t('A city appears here once enough makers print there.')}
        </p>
        {cities.length === 0 ? (
          <p className="mt-8 rounded-lg border border-line bg-paper-sunken p-4 text-sm text-ink-700">
            {t('No city has enough makers yet.')}{' '}
            <Link href="/for-makers" className="underline">
              {t('Print in your city? Join as a maker.')}
            </Link>
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-line">
            {cities.map((c) => (
              <li key={c.slug} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                <Link
                  href={`/cities/${c.slug}`}
                  className="font-display text-lg font-semibold text-ink-900 hover:underline"
                >
                  {c.city}
                </Link>
                <span className="tabular font-mono text-xs text-ink-600">
                  {c.country} · {t('{count} makers', { count: c.makers ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
