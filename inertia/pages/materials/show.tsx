import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Props = {
  material: {
    slug: string
    name: string
    technology: string
    makers: number | null
    rate: { minMinor: number; maxMinor: number; currency: string } | null
  }
  html: string | null
  description: string
  indexable: boolean
  canonicalUrl: string
}

export default function MaterialShow({
  material,
  html,
  description,
  indexable,
  canonicalUrl,
}: Props) {
  const { t } = useT()
  return (
    <>
      <Head title={`${material.name} — Fabrmatch`}>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        {!indexable && <meta name="robots" content="noindex, follow" />}
      </Head>
      <article className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/materials" className="text-sm text-ink-700 hover:underline">
          ← {t('All materials')}
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink-900">{material.name}</h1>
        <p className="tabular mt-1 font-mono text-xs text-ink-600">{material.technology}</p>

        {material.makers !== null && material.rate ? (
          <dl className="mt-6 grid gap-4 rounded-lg border border-line bg-paper-sunken p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-600">{t('Makers printing it')}</dt>
              <dd className="tabular font-mono text-xl text-ink-900">{material.makers}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-600">{t('Maker rate per gram')}</dt>
              <dd className="tabular font-mono text-xl text-ink-900">
                {formatMoney(material.rate.minMinor, material.rate.currency)} –{' '}
                {formatMoney(material.rate.maxMinor, material.rate.currency)}
              </dd>
            </div>
            <p className="text-xs text-ink-600 sm:col-span-2">
              {t(
                'Material only. The price you pay also includes print time, shipping and platform fees; get the exact price by uploading your model.'
              )}
            </p>
          </dl>
        ) : (
          <p className="mt-6 rounded-lg border border-line bg-paper-sunken p-4 text-sm text-ink-700">
            {t('We are still onboarding makers for this material.')}{' '}
            <Link href="/for-makers" className="underline">
              {t('Print it? Join as a maker.')}
            </Link>
          </p>
        )}

        {html && (
          <div
            className="mt-8 space-y-4 text-ink-800 [&_a]:font-medium [&_a]:text-ink-900 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
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
