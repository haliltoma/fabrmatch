import { sdk } from './sdk';
import type { ProductMetadata } from './mercur-types';

/**
 * Build-time (SSG) veri çekme yardımcıları. 01-PRD: kategori/ürün sayfaları statik
 * üretilir — bu fonksiyonlar `getStaticPaths()` ve sayfa frontmatter'ında çalışır.
 */

const PRODUCT_FIELDS =
  'id,title,handle,description,thumbnail,metadata,categories.id,categories.name,categories.handle,' +
  'options.id,options.title,options.values.value,variants.id,variants.title,variants.offer_id,' +
  'variants.calculated_price,variants.options.value,variants.options.option.title';

export type VariantOption = { value: string; option: { title: string } | null };
export type Variant = {
  id: string;
  title: string;
  offer_id: string | null;
  calculated_price: { calculated_amount: number; original_amount: number; currency_code: string } | null;
  options: VariantOption[];
};
export type ProductOption = { id: string; title: string; values: { value: string }[] };
export type Category = { id: string; name: string; handle: string };
export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  thumbnail: string | null;
  metadata: ProductMetadata | null;
  categories: Category[];
  options: ProductOption[];
  variants: Variant[];
};

let cachedRegion: { id: string; currency_code: string } | null = null;

/** MVP: tek bölge (TRY). Çoklu bölge/dil algılama ertelendi — bkz. docs/07 kararı. */
export async function getDefaultRegion() {
  if (cachedRegion) return cachedRegion;
  const { regions } = await sdk.store.region.list({ fields: 'id,currency_code' });
  const region = regions.find((r) => r.currency_code === 'try') ?? regions[0];
  if (!region) {
    throw new Error('Sistem A üzerinde hiç bölge tanımlı değil');
  }
  cachedRegion = { id: region.id, currency_code: region.currency_code };
  return cachedRegion;
}

export async function listAllProducts(): Promise<Product[]> {
  const region = await getDefaultRegion();
  const { products } = await sdk.store.product.list({
    fields: PRODUCT_FIELDS,
    region_id: region.id,
    limit: 100,
  });
  // Özel tasarım ürünleri sepete alınabilir ama katalogda gizli (docs/07, 2026-09-16)
  return (products as unknown as Product[]).filter((p) => !p.metadata?.custom_design);
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const region = await getDefaultRegion();
  const { products } = await sdk.store.product.list({
    fields: PRODUCT_FIELDS,
    region_id: region.id,
    handle,
    limit: 1,
  });
  const product = products[0] as unknown as Product | undefined;
  if (!product || product.metadata?.custom_design) return null;
  return product;
}

/** Sadece ürün taşıyan (alt/leaf) kategoriler — seed verisinde ürünler alt kategoriye bağlı. */
export async function listLeafCategories() {
  const { product_categories } = await sdk.store.category.list({
    fields: 'id,name,handle,parent_category_id,parent_category.name',
    limit: 100,
  });
  return product_categories.filter((category) => category.parent_category_id !== null) as unknown as (Category & {
    parent_category: { name: string } | null;
  })[];
}
