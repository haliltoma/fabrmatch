import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

export default function NotFound() {
  const { t } = useT()

  return (
    <>
      <Head title={t('Page not found')} />
      <section className="layer-lines mx-auto flex max-w-2xl flex-col items-start gap-5 rounded-lg border border-line px-8 py-16">
        <p className="font-mono text-sm text-heat-700">404</p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t("This page didn't print.")}
        </h1>
        <p className="max-w-md text-ink-700">
          {t('The link may be old, or the order or product was removed. Head back and try again.')}
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/">{t('Go home')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/shop">{t('Browse the shop')}</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
