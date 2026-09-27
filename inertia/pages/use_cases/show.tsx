import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { formatPrice } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Props = {
  useCase: {
    slug: string
    title: string
    summary: string
    material: string
    example: { name: string; bboxMm: [number, number, number]; grams: number }
    prices: Array<{ quantity: number; totalMinor: number; perPieceMinor: number }>
    currency: string
    makers: number | null
  }
  html: string | null
  description: string
  indexable: boolean
  canonicalUrl: string
}

export default function UseCaseShow({
  useCase,
  html,
  description,
  indexable,
  canonicalUrl,
}: Props) {
  const { t } = useT()
  const title = t(useCase.title)
  return (
    <>
      <Head title={`${title} — Fabrmatch`}>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {!indexable && <meta name="robots" content="noindex, follow" />}
      </Head>
      <article className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/use-cases" className="text-sm text-ink-700 hover:underline">
          ← {t('All use cases')}
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink-900">{title}</h1>
        <p className="mt-2 text-lg text-ink-700">{t(useCase.summary)}</p>

        <section className="layer-lines mt-6 rounded-lg border border-line bg-paper-sunken p-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {t('What it costs today')}
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {t(
              'Worked out now by our price engine for an example part: {part}, {material}, about {grams} g.',
              {
                part: t(useCase.example.name),
                material: useCase.material,
                grams: Math.round(useCase.example.grams),
              }
            )}
          </p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-ink-600">
                <th className="py-1 font-normal">{t('Quantity')}</th>
                <th className="py-1 font-normal">{t('Per piece')}</th>
                <th className="py-1 text-right font-normal">{t('Total with delivery')}</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {useCase.prices.map((p) => (
                <tr key={p.quantity} className="border-t border-line">
                  <td className="py-2 text-ink-900">{p.quantity}</td>
                  <td className="py-2 text-ink-900">
                    {formatPrice(p.perPieceMinor, useCase.currency)}
                  </td>
                  <td className="py-2 text-right font-medium text-ink-900">
                    {formatPrice(p.totalMinor, useCase.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-600">
            {useCase.makers !== null
              ? t(
                  '{n} verified makers print {material} right now. Your own model gets its exact price when you upload it.',
                  {
                    n: useCase.makers,
                    material: useCase.material,
                  }
                )
              : t(
                  'We are still onboarding makers for {material}. Your own model gets its exact price when you upload it.',
                  {
                    material: useCase.material,
                  }
                )}
          </p>
        </section>

        {html && (
          <div
            className="mt-8 space-y-4 text-ink-800 [&_a]:font-medium [&_a]:text-ink-900 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
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
