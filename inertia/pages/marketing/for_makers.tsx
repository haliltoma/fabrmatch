import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { WaitlistForm } from '~/components/waitlist_form'
import { Reveal } from '~/components/reveal'
import { useT } from '~/lib/i18n'

const POINTS = [
  {
    title: 'Orders that fit your machines',
    body: 'You list printers, materials, colours and free hours. An offer only reaches you when the part fits your build volume, material and calendar.',
  },
  {
    title: 'New makers get offers too',
    body: 'A share of offers is reserved for makers who just joined, so you are not buried behind whoever has the longest history.',
  },
  {
    title: 'You set your price per gram',
    body: 'Your material price is yours. If you ask more than the platform pays, you simply are not matched. The app shows how many jobs that cost you.',
  },
  {
    title: 'Paid once the buyer confirms',
    body: 'The buyer’s money is held from the start. It is released after delivery is confirmed, and a dispute pauses it until it is decided.',
  },
  {
    title: 'No back-and-forth with buyers',
    body: 'You get the file, the ship-to address and a deadline. Questions go through anonymous messages; contact details are hidden on both sides.',
  },
]

const FLOW = [
  ['Offer arrives', 'You have a short window to accept or pass.'],
  ['Print and photograph', 'Add photos of the finished part before you ship.'],
  ['Ship with tracking', 'Enter the carrier and number. The buyer follows it.'],
  ['Get paid', 'Your share is released after delivery, minus the platform fee.'],
]

export default function ForMakers({
  waiting,
  variant,
}: {
  waiting: number | null
  variant: string
}) {
  const { t } = useT()

  return (
    <>
      <Head title={t('Print orders for your 3D printers — for makers')}>
        <meta
          name="description"
          content={t(
            'Fabrmatch sends made-to-order 3D print jobs to makers whose printers, materials and free hours fit. Set your own price; payment is held until delivery.'
          )}
        />
      </Head>

      <section className="layer-lines border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-700">
              {t('For makers')}
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] text-ink-900 sm:text-6xl">
              {variant === 'B' ? (
                <>
                  {t('Turn idle printer hours')}
                  <br />
                  {t('into paid orders.')}
                </>
              ) : (
                <>
                  {t('Fill your printers')}
                  <br />
                  {t('with paid jobs.')}
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-700">
              {variant === 'B'
                ? t(
                    'The buyer’s payment is held from the start and released after delivery. You print and ship; we bring the buyer and handle disputes.'
                  )
                : t(
                    'Turn idle machine hours into orders. You print and ship; we bring the buyer, hold the payment and handle disputes.'
                  )}
            </p>
            {waiting !== null && (
              <p className="mt-6 font-mono text-sm text-ink-700">
                {waiting === 1
                  ? t('{count} maker already waiting for launch', { count: waiting })
                  : t('{count} makers already waiting for launch', { count: waiting })}
              </p>
            )}
          </div>

          <div className="rounded-[10px] border border-line bg-paper-raised p-6 sm:p-8" id="join">
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              {t('Get on the maker list')}
            </h2>
            <p className="mb-5 mt-1 text-sm text-ink-600">
              {t('We open city by city. Tell us where your printers are.')}
            </p>
            <WaitlistForm interest="maker" cityLabel={t('City')} cta={t('Join the maker list')} />
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
          {t('What working with us looks like')}
        </h2>
        <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.04}>
              <dt className="font-display text-xl font-semibold text-ink-900">{t(p.title)}</dt>
              <dd className="mt-2 text-ink-700">{t(p.body)}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section className="border-t border-line bg-paper-sunken">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink-900">
            {t('A job, start to finish')}
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {FLOW.map(([title, body], i) => (
              <li key={title} className="border-t-2 border-ink-900 pt-4">
                <p className="font-mono text-xs text-ink-600">0{i + 1}</p>
                <p className="mt-1 font-display text-lg font-semibold text-ink-900">{t(title)}</p>
                <p className="mt-1 text-sm text-ink-700">{t(body)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Button asChild>
              <a href="#join">{t('Join the maker list')}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

ForMakers.fullBleed = true
