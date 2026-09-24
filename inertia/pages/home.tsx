import { Head, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, BadgeCheck, FileUp, Printer, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useT } from '~/lib/i18n'
import { Button } from '~/components/ui/button'
import { LayerStepper } from '~/components/layer_stepper'
import { Reveal } from '~/components/reveal'
import { AudienceTabs } from '~/components/audience_tabs'
import { ProofStrip, type HomeStats } from '~/components/proof_strip'
import { LearnBand, type HomeGuide } from '~/components/learn_band'
import { NearbyBand } from '~/components/nearby_band'
import { IncomeBand } from '~/components/income_band'
import type { IncomeRules } from '~/lib/income'
import { Discover, type HomeMaterial, type HomeProduct } from '~/components/discover'
import { PrintArt, type PrintKind } from '~/components/print_art'

const HERO_PARTS: Array<{ kind: PrintKind; color: string; tint: string; name: string }> = [
  { kind: 'vase', color: '#f0501e', tint: 'bg-spool-orange/15', name: 'Vase' },
  { kind: 'planter', color: '#9db8a0', tint: 'bg-spool-sage/25', name: 'Planter' },
  { kind: 'stand', color: '#d9a420', tint: 'bg-spool-mustard/20', name: 'Phone stand' },
  { kind: 'clip', color: '#2f7d8b', tint: 'bg-spool-teal/15', name: 'Cable clip' },
]

const TRUST = [
  { icon: FileUp, text: 'See a price without an account' },
  { icon: ShieldCheck, text: 'Payment held until delivery' },
  { icon: BadgeCheck, text: 'Only verified makers print' },
]

const SAMPLE_TIMELINE = [
  { status: 'paid', at: '2026-01-12T09:14:00Z' },
  { status: 'matching', at: '2026-01-12T09:14:20Z' },
  { status: 'in_production', at: '2026-01-12T09:41:00Z' },
  { status: 'shipped', at: '2026-01-14T15:02:00Z' },
  { status: 'delivered', at: '2026-01-15T11:30:00Z' },
]

export default function Home({
  stats,
  incomeRules,
  guides,
  products,
  materials,
}: {
  stats: HomeStats
  incomeRules: IncomeRules
  guides: HomeGuide[]
  products: HomeProduct[]
  materials: HomeMaterial[]
}) {
  const { t } = useT()
  const { siteUrl } = usePage<{ siteUrl: string }>().props
  const jsonLd = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Fabrmatch',
      'url': siteUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Fabrmatch',
      'url': siteUrl,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${siteUrl}/shop?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ]).replaceAll('<', '\\u003c')
  return (
    <>
      <Head title={t('Custom 3D printing, made to order')}>
        <meta
          name="description"
          content={t(
            'Upload a 3D model, get a price, and have a verified nearby maker print it. Your payment is held until the part arrives.'
          )}
        />
        <link rel="canonical" href={`${siteUrl}/`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>

      {/* Hero */}
      <section className="layer-lines border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-700">
              {t('Made to order')}
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] text-ink-900 sm:text-6xl lg:text-7xl">
              {t('Send a model.')}
              <br />
              {t('Get a printed part.')}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-700">
              {t(
                'A verified maker near you prints it, ships it, and your payment stays held until it is in your hands.'
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="accent" asChild>
                <Link href="/tools/quick-quote">
                  {t('Get an instant price')} <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/shop">{t('Browse the shop')}</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
              {TRUST.map((item) => (
                <li key={item.text} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-fil-600" aria-hidden />
                  {t(item.text)}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <ul className="grid grid-cols-2 gap-3">
              {HERO_PARTS.map((part) => (
                <li
                  key={part.kind}
                  className={`flex aspect-[4/3] items-center justify-center rounded-lg border border-line ${part.tint}`}
                >
                  <PrintArt
                    kind={part.kind}
                    color={part.color}
                    label={t(part.name)}
                    className="h-4/5"
                  />
                </li>
              ))}
            </ul>
            <figure className="rounded-lg border border-line bg-paper-raised p-5">
              <figcaption className="mb-4 flex items-center justify-between text-sm">
                <span className="font-medium text-ink-900">{t('How an order moves')}</span>
                <span className="font-mono text-xs text-ink-600">{t('example')}</span>
              </figcaption>
              <LayerStepper entries={SAMPLE_TIMELINE} />
            </figure>
          </div>
        </div>
      </section>

      <ProofStrip stats={stats} />

      {/* How it works, per audience */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <AudienceTabs />
        </Reveal>
      </section>

      <Discover products={products} materials={materials} />

      <IncomeBand rules={incomeRules} />

      {/* Escrow band */}
      <section className="layer-lines-light bg-ink-900 text-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.2fr] lg:px-8">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            {t("Your payment waits until you say it's fine.")}
          </h2>
          <div className="space-y-4 text-ink-200">
            <p>
              {t(
                'The money is held while your part is made. You have {days} days after delivery to confirm or report a problem; if you say nothing, it is released to the maker.',
                { days: stats.confirmDays }
              )}
            </p>
            <p>
              {t(
                'If a part arrives wrong, open a dispute and attach photos. Payment stays on hold until an admin decides: full refund, partial refund, or release.'
              )}
            </p>
          </div>
        </div>
      </section>

      <NearbyBand makers={stats.makers} />

      <LearnBand guides={guides} />

      {/* Two audiences */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2 lg:px-8">
        <Reveal>
          <div className="flex h-full flex-col justify-between rounded-lg border border-line bg-paper-raised p-8">
            <div>
              <Printer className="h-7 w-7 text-ink-900" aria-hidden />
              <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                {t('Own a printer?')}
              </h3>
              <p className="mt-2 max-w-sm text-ink-700">
                {t(
                  'Set your machines, materials and weekly capacity. Get offers that fit, and get paid when the buyer confirms.'
                )}
              </p>
            </div>
            <Button className="mt-6 self-start" variant="outline" asChild>
              <Link route="new_account.create">{t('Become a maker')}</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <div className="flex h-full flex-col justify-between rounded-lg border border-line bg-paper-raised p-8">
            <div>
              <ShoppingBag className="h-7 w-7 text-ink-900" aria-hidden />
              <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                {t('Selling designs?')}
              </h3>
              <p className="mt-2 max-w-sm text-ink-700">
                {t(
                  'List products from the catalog, set your margin, and we handle printing, shipping and payment for every order.'
                )}
              </p>
            </div>
            <Button className="mt-6 self-start" variant="outline" asChild>
              <Link route="new_account.create">{t('Start selling')}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  )
}

Home.fullBleed = true
