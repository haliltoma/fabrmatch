import { Link } from '@adonisjs/inertia/react'
import { formatPrice } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { Seo } from '~/components/seo'

type Props = {
  city: {
    slug: string
    name: string
    country: string
    makers: number
    materials: Array<{ code: string; minMinor: number; maxMinor: number; currency: string }>
  }
  canonicalUrl: string
}

/** Only real numbers: how many makers print here and what they charge per gram. No names. */
export default function CityShow({ city, canonicalUrl }: Props) {
  const { t } = useT()
  const title = t('3D printing in {city}', { city: city.name })
  return (
    <>
      <Seo
        title={`${title} — Fabrmatch`}
        description={t(
          '{count} makers print in {city}. Upload your model and get a delivered price.',
          { count: city.makers, city: city.name }
        )}
        canonical={canonicalUrl}
        breadcrumbs={[{ name: t('Cities'), path: '/cities' }, { name: city.name }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          'name': title,
          'serviceType': '3D printing',
          'areaServed': { '@type': 'City', 'name': city.name },
          'provider': { '@type': 'Organization', 'name': 'Fabrmatch' },
        }}
      />
      <article className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/cities" className="text-sm text-ink-700 hover:underline">
          ← {t('All cities')}
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink-900">{title}</h1>
        <p className="mt-3 text-ink-700">
          {t(
            'Local makers print your part and ship it to you. You see the price before you order, and payment stays protected until delivery.'
          )}
        </p>

        <dl className="mt-6 rounded-lg border border-line bg-paper-sunken p-4">
          <dt className="text-xs text-ink-600">
            {t('Makers printing in {city}', { city: city.name })}
          </dt>
          <dd className="tabular font-mono text-xl text-ink-900">{city.makers}</dd>
        </dl>

        {city.materials.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-ink-900">
              {t('Materials and maker rates here')}
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {city.materials.map((m) => (
                <li key={m.code} className="flex flex-wrap justify-between gap-3 py-2 text-sm">
                  <Link
                    href={`/materials/${m.code.toLowerCase()}`}
                    className="font-mono text-ink-900 underline"
                  >
                    {m.code}
                  </Link>
                  <span className="tabular text-ink-700">
                    {formatPrice(m.minMinor, m.currency)} – {formatPrice(m.maxMinor, m.currency)}{' '}
                    {t('per gram')}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-600">
              {t(
                'Material only. The price you pay also includes print time, shipping and platform fees; get the exact price by uploading your model.'
              )}
            </p>
          </section>
        )}

        <p className="mt-10">
          <Link href="/tools/quick-quote" className="font-medium text-ink-900 underline">
            {t('Get a price for your model')}
          </Link>
        </p>
      </article>
    </>
  )
}
