import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Seo } from '~/components/seo'
import { Link } from '@adonisjs/inertia/react'
import { Search } from 'lucide-react'
import { useT } from '~/lib/i18n'
import { ProductThumb, type ShopImage } from '~/components/product_image'
import { formatPrice } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { SkeletonGrid } from '~/components/ui/skeleton'
import { useSamePageLoading } from '~/lib/use_navigation'

type ProductCard = {
  id: string
  slug: string
  title: string
  description: string | null
  materials: string[]
  fromPriceMinor: number
  currency: string
  bboxMm: number[] | null
  category: { slug: string; name: string } | null
  tags: string[]
  image: ShopImage | null
}

type Filters = {
  q: string
  material: string
  category: string
  tag: string
  minPrice: string | null
  maxPrice: string | null
  sort: string
}

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON', 'RESIN']

export default function ShopIndex({
  items,
  total,
  page,
  perPage,
  filters,
  categories,
  canonicalUrl,
}: {
  items: ProductCard[]
  total: number
  page: number
  perPage: number
  filters: Filters
  categories: Array<{ slug: string; name: string }>
  canonicalUrl: string
}) {
  const { t } = useT()
  const loading = useSamePageLoading()
  const [q, setQ] = useState(filters.q)
  const pages = Math.max(1, Math.ceil(total / perPage))

  function apply(next: Partial<Filters> & { page?: number }) {
    const merged = { ...filters, q, ...next }
    router.get(
      '/shop',
      {
        q: merged.q || undefined,
        material: merged.material || undefined,
        category: merged.category || undefined,
        tag: merged.tag || undefined,
        minPrice: merged.minPrice ?? undefined,
        maxPrice: merged.maxPrice ?? undefined,
        sort: merged.sort !== 'newest' ? merged.sort : undefined,
        page: next.page && next.page > 1 ? next.page : undefined,
      },
      { preserveScroll: true }
    )
  }

  return (
    <>
      <Seo
        title={t('Shop')}
        description={t('3D printed products made on demand by verified local manufacturers.')}
        canonical={canonicalUrl}
        breadcrumbs={[{ name: t('Shop') }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          'name': t('Fabrmatch Shop'),
          'itemListElement': items.map((p, i) => ({
            '@type': 'ListItem',
            'position': (page - 1) * perPage + i + 1,
            'url': `${canonicalUrl}/${p.id}/${p.slug}`,
            'name': p.title,
          })),
        }}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">{t('Shop')}</h1>
          <p className="text-ink-600">{t('Made to order — printed close to you, paid safely.')}</p>
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            apply({ page: 1 })
          }}
        >
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-600" />
            <Input
              aria-label={t('Search products')}
              className="pl-9"
              placeholder={t('Search products')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label={t('Material')}
            className="h-10 rounded-md border border-line bg-paper-raised px-3 text-sm"
            value={filters.material}
            onChange={(e) => apply({ material: e.target.value, page: 1 })}
          >
            <option value="">{t('All materials')}</option>
            {MATERIALS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label={t('Sort')}
            className="h-10 rounded-md border border-line bg-paper-raised px-3 text-sm"
            value={filters.sort}
            onChange={(e) => apply({ sort: e.target.value, page: 1 })}
          >
            <option value="newest">{t('Newest')}</option>
            <option value="price_asc">{t('Price: low to high')}</option>
            <option value="price_desc">{t('Price: high to low')}</option>
          </select>
          <Button type="submit">{t('Search')}</Button>
        </form>

        {(categories.length > 0 || filters.tag) && (
          <ul className="mb-4 flex flex-wrap gap-2" aria-label={t('Categories')}>
            {categories.length > 0 && (
              <li>
                <button
                  type="button"
                  aria-pressed={filters.category === ''}
                  onClick={() => apply({ category: '', page: 1 })}
                  className={`rounded-full border px-3 py-1 text-sm ${filters.category === '' ? 'border-ink-900 bg-ink-900 text-paper' : 'border-line text-ink-700'}`}
                >
                  {t('All')}
                </button>
              </li>
            )}
            {categories.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  aria-pressed={filters.category === c.slug}
                  onClick={() => apply({ category: c.slug, page: 1 })}
                  className={`rounded-full border px-3 py-1 text-sm ${filters.category === c.slug ? 'border-ink-900 bg-ink-900 text-paper' : 'border-line text-ink-700'}`}
                >
                  {c.name}
                </button>
              </li>
            ))}
            {filters.tag && (
              <li>
                <button
                  type="button"
                  onClick={() => apply({ tag: '', page: 1 })}
                  className="rounded-full border border-heat-700 px-3 py-1 text-sm text-heat-700"
                >
                  #{filters.tag} ✕
                </button>
              </li>
            )}
          </ul>
        )}

        {loading ? (
          <SkeletonGrid
            count={Math.max(4, Math.min(items.length, 8))}
            className="gap-4"
            label={t('Loading products…')}
          />
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-ink-600">
              {t('No products match your search.')}
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <li key={p.id}>
                <Link href={`/shop/${p.id}/${p.slug}`} className="block h-full">
                  <Card className="h-full overflow-hidden transition-colors hover:border-heat-500">
                    <ProductThumb image={p.image} title={p.title} bboxMm={p.bboxMm} />
                    <CardContent className="space-y-2 p-4">
                      <h2 className="font-semibold text-ink-900">{p.title}</h2>
                      {p.description && (
                        <p className="line-clamp-2 text-sm text-ink-600">{p.description}</p>
                      )}
                      <p className="text-sm text-ink-800">
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
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav className="flex items-center justify-center gap-3" aria-label={t('Pagination')}>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => apply({ page: page - 1 })}
            >
              {t('Previous')}
            </Button>
            <span className="text-sm text-ink-600">
              {t('Page {page} of {pages}', { page, pages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => apply({ page: page + 1 })}
            >
              {t('Next')}
            </Button>
          </nav>
        )}
      </div>
    </>
  )
}
