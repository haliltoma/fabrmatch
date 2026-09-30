import { Head, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { BadgeCheck, FileUp, ShieldCheck } from 'lucide-react'
import { useT } from '~/lib/i18n'
import { Reveal } from '~/components/reveal'
import { AudienceTabs } from '~/components/audience_tabs'
import type { HomeStats } from '~/lib/home_stats'
import { WhyStrip } from '~/components/why_strip'
import { HomeFaq } from '~/components/home_faq'
import { HeroQuickStart } from '~/components/hero_quick_start'
import { HeroCube } from '~/components/hero_cube'
import { ClosingBand } from '~/components/closing_band'
import { LearnBand, type HomeGuide } from '~/components/learn_band'
import { PrintShowcase } from '~/components/print_showcase'
import { NearbyBand } from '~/components/nearby_band'
import { MarginBand, type MarginSample } from '~/components/margin_band'
import { IncomeBand } from '~/components/income_band'
import type { IncomeRules } from '~/lib/income'
import { Discover, type HomeMaterial, type HomeProduct } from '~/components/discover'

const TRUST = [
  { icon: FileUp, text: 'See a price without an account' },
  { icon: ShieldCheck, text: 'Payment held until delivery' },
  { icon: BadgeCheck, text: 'Only verified makers print' },
]

export default function Home({
  stats,
  ctaVariant,
  faq,
  marginSamples,
  incomeRules,
  guides,
  products,
  materials,
}: {
  stats: HomeStats
  ctaVariant: string
  faq: Array<{ q: string; a: string }>
  marginSamples: MarginSample[]
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
            <h1 className="font-display text-5xl font-semibold leading-[1.02] text-ink-900 sm:text-6xl lg:text-7xl">
              {t('Design it.')}
              <br />
              {t('Print it.')}
              <br />
              <span className="relative inline-block">
                <span
                  className="absolute inset-x-0 bottom-1 -z-0 h-4 -rotate-1 bg-lime sm:h-5"
                  aria-hidden
                />
                <span className="relative">{t('Sell it.')}</span>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-700">
              {t(
                'Drop a 3D model and see its price. A verified maker near you prints and ships it. Selling? No stock, no printer — your margin is yours.'
              )}
            </p>
            <div className="mt-8 max-w-xl">
              <HeroQuickStart />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
              {ctaVariant === 'B' ? (
                <Link
                  route="new_account.create"
                  className="text-ink-900 underline underline-offset-4"
                >
                  {t('Upload a model')}
                </Link>
              ) : (
                <Link href="/for-sellers" className="text-ink-900 underline underline-offset-4">
                  {t('Start selling without stock')}
                </Link>
              )}
              <Link href="/shop" className="text-ink-900 underline underline-offset-4">
                {t('Browse the shop')}
              </Link>
              <Link href="/for-makers" className="text-ink-900 underline underline-offset-4">
                {t('Earn with your printer')}
              </Link>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
              {TRUST.map((item) => (
                <li key={item.text} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-fil-600" aria-hidden />
                  {t(item.text)}
                </li>
              ))}
            </ul>
          </div>

          <HeroCube samples={marginSamples} />
        </div>
      </section>

      <PrintShowcase />

      <WhyStrip />

      {/* How it works, per audience */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <AudienceTabs />
        </Reveal>
      </section>

      <Discover products={products} materials={materials} />

      <MarginBand samples={marginSamples} />

      <IncomeBand rules={incomeRules} />

      {/* Escrow band */}
      <section className="palette-light layer-lines-light bg-ink-900 text-paper">
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

      <HomeFaq faq={faq} />

      <ClosingBand />
    </>
  )
}

Home.fullBleed = true
