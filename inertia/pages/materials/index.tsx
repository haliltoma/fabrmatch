import { Link } from '@adonisjs/inertia/react'
import { useT } from '~/lib/i18n'
import { Seo } from '~/components/seo'

type Material = { slug: string; name: string; technology: string; makers: number | null }

export default function Materials({
  materials,
  indexable,
  canonicalUrl,
}: {
  materials: Material[]
  indexable: boolean
  canonicalUrl: string
}) {
  const { t } = useT()
  return (
    <>
      <Seo
        title={t('3D printing materials — Fabrmatch')}
        description={t('What each 3D printing material is good for, and how many makers print it.')}
        canonical={canonicalUrl}
        noindex={!indexable}
        breadcrumbs={[{ name: t('Materials') }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('3D printing materials')}
        </h1>
        <p className="mt-2 text-ink-700">
          {t('What each material is good for, and how many makers print it.')}
        </p>
        <ul className="mt-8 divide-y divide-line">
          {materials.map((m) => (
            <li key={m.slug} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
              <Link
                href={`/materials/${m.slug}`}
                className="font-display text-lg font-semibold text-ink-900 hover:underline"
              >
                {m.name}
              </Link>
              <span className="tabular font-mono text-xs text-ink-600">
                {m.technology}
                {m.makers !== null ? ` · ${t('{count} makers', { count: m.makers })}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
