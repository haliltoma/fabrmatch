import { Head } from '@inertiajs/react'
import { useT } from '~/lib/i18n'

export default function Changelog({ html }: { html: string }) {
  const { t } = useT()

  return (
    <>
      <Head title={t('Changelog — Fabrmatch')}>
        <meta name="description" content={t('What is new on Fabrmatch.')} />
      </Head>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div
          className="space-y-4 text-ink-800 [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  )
}
