import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { PrintArt, type PrintKind } from '~/components/print_art'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

export type HomeProduct = {
  id: number
  slug: string
  title: string
  materials: string[]
  fromPriceMinor: number
  currency: string
}
export type HomeMaterial = { slug: string; code: string; name: string; technology: string }

const SWATCH = ['#9db8a0', '#2f7d8b', '#d9a420', '#e7a79a', '#23282e', '#f0501e']
const TINT = [
  'bg-spool-sage/25',
  'bg-spool-teal/15',
  'bg-spool-mustard/20',
  'bg-spool-rose/25',
  'bg-spool-ink/10',
  'bg-spool-orange/15',
]
const KINDS: PrintKind[] = ['vase', 'planter', 'stand', 'clip']

/** Real shop products and real active materials; nothing here is invented. */
export function Discover({
  products,
  materials,
}: {
  products: HomeProduct[]
  materials: HomeMaterial[]
}) {
  const { t } = useT()
  return (
    <>
      {products.length > 0 && (
        <section className="border-t border-line bg-paper-sunken">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="max-w-xl font-display text-4xl font-semibold text-ink-900">
                {t('Ready to order from the shop')}
              </h2>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-900 underline underline-offset-4"
              >
                {t('See all products')} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ul
              className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4"
              aria-label={t('Shop products')}
            >
              {products.map((p, i) => (
                <li key={p.id} className="w-64 shrink-0 snap-start">
                  <Link
                    href={`/shop/${p.id}/${p.slug}`}
                    className="block h-full rounded-[10px] border border-line bg-paper-raised transition-colors hover:border-ink-900/40"
                  >
                    <div
                      className={`layer-lines flex h-32 items-end rounded-t-[10px] p-4 ${TINT[i % TINT.length]}`}
                    >
                      <span className="font-display text-5xl font-semibold leading-none text-ink-900">
                        {p.title.charAt(0)}
                      </span>
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="font-display text-lg font-semibold text-ink-900">{p.title}</h3>
                      <p className="text-sm text-ink-700">
                        {t('from')}{' '}
                        <span className="font-semibold">
                          {formatMoney(p.fromPriceMinor, p.currency)}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {p.materials.map((m) => (
                          <Badge key={m} variant="outline">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {materials.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-xl font-display text-4xl font-semibold text-ink-900">
              {t('Pick the material for the job')}
            </h2>
            <Link
              href="/materials"
              className="inline-flex items-center gap-1 text-sm font-medium text-ink-900 underline underline-offset-4"
            >
              {t('Compare materials')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {materials.map((m, i) => (
              <li key={m.slug}>
                <Link
                  href={`/materials/${m.slug}`}
                  className="block rounded-[10px] border border-line bg-paper-raised p-4 transition-colors hover:border-ink-900/40"
                >
                  <div
                    className={`flex h-24 items-center justify-center rounded-md ${TINT[i % TINT.length]}`}
                  >
                    <PrintArt
                      kind={KINDS[i % KINDS.length]}
                      color={SWATCH[i % SWATCH.length]}
                      className="h-4/5"
                    />
                  </div>
                  <p className="mt-3 font-display text-lg font-semibold text-ink-900">{m.name}</p>
                  <p className="font-mono text-xs text-ink-600">{m.technology}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
