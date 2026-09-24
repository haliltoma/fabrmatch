import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

export default function ServerError() {
  const { t } = useT()

  return (
    <>
      <Head title={t('Something went wrong')} />
      <section className="layer-lines mx-auto flex max-w-2xl flex-col items-start gap-5 rounded-lg border border-line px-8 py-16">
        <p className="font-mono text-sm text-danger">500</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('Something went wrong.')}
        </h1>
        <p className="max-w-md text-ink-700">
          {t(
            "It's on our side, not yours. Nothing was charged by this request. Try again in a moment."
          )}
        </p>
        <Button asChild>
          <Link href="/">{t('Go home')}</Link>
        </Button>
      </section>
    </>
  )
}
