import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product, Category } from '../lib/store-data';

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'name';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',    label: 'önerilen' },
  { key: 'price-asc',  label: 'ucuz → pahalı' },
  { key: 'price-desc', label: 'pahalı → ucuz' },
  { key: 'name',       label: 'a–z' },
];

const CAT_ICONS: Record<string, string> = {
  'duvar-dekoru':         'ti-layout-columns',
  'saksilar':             'ti-plant',
  'aydinlatma':           'ti-bulb',
  'telefon-standlari':    'ti-device-mobile',
  'zar-kuleleri':         'ti-dice',
  'organizerler':         'ti-box-seam',
  'masa-oyunu-parcalari': 'ti-tournament',
  'mutfak':               'ti-chef-hat',
};

function iconFor(handle: string) {
  return CAT_ICONS[handle] ?? 'ti-cube';
}

function minPrice(product: Product): number {
  const amounts = product.variants
    .map(v => v.calculated_price?.calculated_amount)
    .filter((a): a is number => a != null);
  return amounts.length ? Math.min(...amounts) : Infinity;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function ProductCard({ product }: { product: Product }) {
  const prices = product.variants.map(v => v.calculated_price).filter(p => p !== null);
  const cheapest = prices.length
    ? prices.reduce((min, p) => p!.calculated_amount < min!.calculated_amount ? p : min)
    : null;

  return (
    <motion.a
      href={`/urun/${product.handle}`}
      className="fm-product-card"
      /* initial={false} on AnimatePresence handles the "no animation on first load" case.
         On subsequent filter changes, these initial/animate/exit values kick in. */
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <div className="fm-product-card__media">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.title} loading="lazy" />
        ) : (
          <div className="fm-product-card__placeholder" aria-hidden="true">
            <i className="ti ti-rotate-3d" />
          </div>
        )}
        <span className="fm-3d-badge">
          <i className="ti ti-rotate-3d" aria-hidden="true" />
          3D
        </span>
      </div>
      <div className="fm-product-card__body">
        <h3>{product.title}</h3>
        <span className="fm-small fm-muted">{product.categories[0]?.name}</span>
        {cheapest && (
          <span className="fm-product-card__price">
            {formatPrice(cheapest.calculated_amount, cheapest.currency_code)}'den
          </span>
        )}
      </div>
    </motion.a>
  );
}

type Props = {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  hideCategoryFilter?: boolean;
};

export default function ProductsWithFilter({
  products,
  categories,
  initialCategory,
  hideCategoryFilter = false,
}: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(initialCategory ?? null);
  const [sort, setSort]           = useState<SortKey>('default');

  const filtered = useMemo(() => {
    let result = activeCat
      ? products.filter(p => p.categories.some(c => c.handle === activeCat))
      : [...products];

    if (sort === 'price-asc')  result = [...result].sort((a, b) => minPrice(a) - minPrice(b));
    if (sort === 'price-desc') result = [...result].sort((a, b) => minPrice(b) - minPrice(a));
    if (sort === 'name')       result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'tr'));

    return result;
  }, [products, activeCat, sort]);

  const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };

  return (
    <>
      <div className="fm-filter-section">
        {/* Kategori çipleri */}
        {!hideCategoryFilter && (
          <div className="fm-filter-bar" role="group" aria-label="Kategori filtresi">
            <motion.button
              className="fm-filter-chip"
              data-active={activeCat === null ? 'true' : 'false'}
              onClick={() => setActiveCat(null)}
              whileTap={{ scale: 0.94 }}
              transition={spring}
            >
              <i className="ti ti-grid-dots" aria-hidden="true" />
              tümü
            </motion.button>
            {categories.map(cat => (
              <motion.button
                key={cat.handle}
                className="fm-filter-chip"
                data-active={activeCat === cat.handle ? 'true' : 'false'}
                onClick={() => setActiveCat(activeCat === cat.handle ? null : cat.handle)}
                whileTap={{ scale: 0.94 }}
                transition={spring}
              >
                <i className={`ti ${iconFor(cat.handle)}`} aria-hidden="true" />
                {cat.name}
              </motion.button>
            ))}
          </div>
        )}

        {/* Sayım + sıralama */}
        <div className="fm-sort-row">
          <span className="fm-filter-count">
            <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {filtered.length}
            </strong>{' '}
            ürün
          </span>
          <div className="fm-sort-group" role="group" aria-label="Sıralama">
            {SORT_OPTIONS.map(opt => (
              <motion.button
                key={opt.key}
                className="fm-filter-chip"
                data-active={sort === opt.key ? 'true' : 'false'}
                onClick={() => setSort(opt.key)}
                whileTap={{ scale: 0.94 }}
                transition={spring}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Ürün grid — initial={false} sayfa ilk yüklendiğinde kartları görünür tutar,
          filtre değişince AnimatePresence exit/enter animasyonları çalışır */}
      {filtered.length > 0 ? (
        <div className="fm-product-grid">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.p
          className="fm-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          Bu kategoride henüz ürün yok.
        </motion.p>
      )}
    </>
  );
}
