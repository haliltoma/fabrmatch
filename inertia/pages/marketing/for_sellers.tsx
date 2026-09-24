import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { WaitlistForm } from '~/components/waitlist_form'
import { Reveal } from '~/components/reveal'
import { useT } from '~/lib/i18n'

const POINTS = [
  {
    title: 'Sell 3D-printed products without a printer',
    body: 'Pick a design from the catalogue, set your margin and publish. When someone buys, a maker prints and ships it.',
  },
  {
    title: 'No stock, no packing',
    body: 'Nothing sits in your flat. Each order is made after it is paid, so you carry no inventory risk.',
  },
  {
    title: 'You choose your margin',
    body: 'The price a buyer sees is production cost plus your margin. Your share of every sale is shown to you before you list.',
  },
  {
    title: 'Buyers are protected, so they buy',
    body: 'Payment is held until delivery is confirmed. That trust is part of the listing, not something you have to explain.',
  },
  {
    title: 'You never handle a support chain',
    body: 'Disputes, refunds and maker questions are ours. You see sales, status and what you earned.',
  },
]

export default function ForSellers({
  waiting,
  variant,
}: {
  waiting: number | null
  variant: string
}) {
  const { t } = useT()

  return (
    <>
      <Head title={t('Sell 3D-printed products without owning a printer — for sellers')}>
        <meta
          name="description"
          content={t(
            'List 3D-printed products, set your margin and let Fabrmatch makers print and ship each order. No stock, no printers.'
          )}
        />
      </Head>

      <section className="layer-lines border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-700">
              {t('For sellers')}
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] text-ink-900 sm:text-6xl">
              {variant === 'B' ? (
                <>
                  {t('Sell custom 3D products')}
                  <br />
                  {t('without holding stock.')}
                </>
              ) : (
                <>
                  {t('Your designs,')}
                  <br />
                  {t('printed on demand.')}
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-700">
              {t(
                'Build a shop of 3D-printed products. Fabrmatch turns each sale into a print job for a verified maker and ships it to your customer.'
              )}
            </p>
            {waiting !== null && (
              <p className="mt-6 font-mono text-sm text-ink-700">
                {waiting === 1
                  ? t('{count} seller already waiting for launch', { count: waiting })
                  : t('{count} sellers already waiting for launch', { count: waiting })}
              </p>
            )}
          </div>

          <div className="rounded-[10px] border border-line bg-paper-raised p-6 sm:p-8" id="join">
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              {t('Get on the seller list')}
            </h2>
            <p className="mb-5 mt-1 text-sm text-ink-600">
              {t('We will write when selling opens.')}
            </p>
            <WaitlistForm interest="seller" cta={t('Join the seller list')} />
            <p className="mt-4 text-sm text-ink-600">
              {t('Already have an account?')}{' '}
              <Link route="session.create" className="font-medium text-heat-700 underline">
                {t('Log in')}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-ink-900">
          {t('How selling works')}
        </h2>
        <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.04}>
              <dt className="font-display text-xl font-semibold text-ink-900">{t(p.title)}</dt>
              <dd className="mt-2 text-ink-700">{t(p.body)}</dd>
            </Reveal>
          ))}
        </dl>
        <div className="mt-10">
          <Button asChild>
            <a href="#join">{t('Join the seller list')}</a>
          </Button>
        </div>
      </section>
    </>
  )
}

ForSellers.fullBleed = true
