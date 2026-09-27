import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { PrintArt, type PrintKind } from '~/components/print_art'
import { formatPrice } from '~/lib/format'
import { ProductThumb, type ShopImage } from '~/components/product_image'
import { useT } from '~/lib/i18n'

export type HomeProduct = {
  id: number
  slug: string
  title: string
  materials: string[]
  fromPriceMinor: number
  currency: string
  image: ShopImage | null
}
export type HomeMaterial = { slug: string; code: string; name: string; technology: string }

const FACES = [
  { bg: 'bg-sun', art: '#f0501e' },
  { bg: 'bg-lime', art: '#2f7d8b' },
  { bg: 'bg-sky', art: '#15181c' },
  { bg: 'bg-blush', art: '#2f7d8b' },
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
        <section className="border-y-2 border-ink-900 bg-sun/25">
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
                    className="block h-full rounded-[10px] border-2 border-ink-900 bg-paper-raised transition-transform duration-150 hover:-translate-y-1 hover:rotate-[0.6deg] motion-reduce:hover:transform-none"
                  >
                    <ProductThumb
                      image={p.image}
                      title={p.title}
                      bboxMm={null}
                      className="h-32 rounded-t-[10px]"
                      letterClass="text-5xl"
                      plateClass={FACES[i % FACES.length].bg}
                    />
                    <div className="space-y-2 p-4">
                      <h3 className="font-display text-lg font-semibold text-ink-900">{p.title}</h3>
                      <p className="text-sm text-ink-700">
                        {t('from')}{' '}
                        <span className="font-semibold">
                          {formatPrice(p.fromPriceMinor, p.currency)}
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
                  className="block rounded-[10px] border-2 border-ink-900 bg-paper-raised p-4 transition-transform duration-150 hover:-translate-y-1 hover:-rotate-[0.6deg] motion-reduce:hover:transform-none"
                >
                  <div
                    className={`flex h-24 items-center justify-center rounded-md border-2 border-ink-900 ${FACES[i % FACES.length].bg}`}
                  >
                    <PrintArt
                      kind={KINDS[i % KINDS.length]}
                      color={FACES[i % FACES.length].art}
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
