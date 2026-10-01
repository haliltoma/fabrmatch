import { Link } from '@adonisjs/inertia/react'
import { useT } from '~/lib/i18n'
import { Seo } from '~/components/seo'

export default function Legal({
  title,
  version,
  html,
  docs,
}: {
  title: string
  version: string
  html: string
  docs: Array<{ slug: string; title: string }>
}) {
  const { t } = useT()

  return (
    <>
      <Seo title={`${t(title)} — Fabrmatch`} noindex breadcrumbs={[{ name: t(title) }]} />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[14rem_1fr]">
        <nav aria-label={t('Legal documents')} className="space-y-1 text-sm">
          {docs.map((d) => (
            <Link
              key={d.slug}
              href={`/legal/${d.slug}`}
              className={`block rounded-md px-3 py-2 ${d.title === title ? 'bg-ink-900 text-paper' : 'text-ink-700 hover:bg-ink-900/5'}`}
            >
              {t(d.title)}
            </Link>
          ))}
        </nav>
        <article>
          <p className="font-mono text-xs text-ink-600">{t('Version {version}', { version })}</p>
          <div
            className="legal-prose mt-2 space-y-4 text-ink-800 [&_blockquote]:rounded-md [&_blockquote]:border [&_blockquote]:border-amber-ink/30 [&_blockquote]:bg-amber-soft [&_blockquote]:p-3 [&_blockquote]:text-sm [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>
    </>
  )
}
