import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

/** The single full-width sun block on the page: one last chance to take the one main action. */
export function ClosingBand() {
  const { t } = useT()
  return (
    <section className="layer-lines border-y-2 border-ink-900 bg-sun text-ink-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6 lg:px-8">
        <div>
          <h2 className="max-w-xl font-display text-4xl font-semibold leading-tight">
            {t('Drop in a model. See a price.')}
          </h2>
          <p className="mt-2 max-w-lg text-ink-900">
            {t('No account needed for an estimate. Payment is held until your part is delivered.')}
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/tools/quick-quote">
            {t('Get an instant price')} <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  )
}
