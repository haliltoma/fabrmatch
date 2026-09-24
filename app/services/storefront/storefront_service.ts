import db from '@adonisjs/lucid/services/db'
import SellerProduct from '#models/seller_product'
import type ModelFile from '#models/model_file'
import { calculatePrice, estimateGrams } from '#services/pricing/price_engine'
import ShippingService from '#services/shipping/shipping_service'
import { bboxOf, type default as ShippingTable } from '#services/shipping/shipping_table'
import { referencePriceFor } from '#services/pricing/reference_prices'

export interface StorefrontFilters {
  q?: string
  material?: string
  category?: string
  tag?: string
  minPriceMinor?: number
  maxPriceMinor?: number
  sort?: 'newest' | 'price_asc' | 'price_desc'
  page?: number
  perPage?: number
}

export interface StorefrontCard {
  id: number
  slug: string
  title: string
  description: string | null
  materials: string[]
  fromPriceMinor: number
  currency: string
  bboxMm: [number, number, number] | null
  category: { slug: string; name: string } | null
  tags: string[]
}

export interface StorefrontDetail extends StorefrontCard {
  scales: number[]
  options: Array<{ material: string; scalePercent: number; unitPriceMinor: number }>
  updatedAt: string
}

const MAX_CANDIDATES = 500

export function slugify(title: string): string {
  return (
    title
      .toLocaleLowerCase('tr')
      .replaceAll('ı', 'i')
      .normalize('NFKD')
      .replaceAll(/[̀-ͯ]/g, '')
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '')
      .slice(0, 80) || 'product'
  )
}

/** Unit price a buyer pays for one piece, computed from the current reference price list. */
export function unitPriceFor(
  product: SellerProduct,
  file: ModelFile,
  material: string,
  shipping?: ShippingTable,
  scalePercent = 100
): number | null {
  const reference = referencePriceFor(material)
  if (!reference || !file.volumeMm3) return null
  const k = scalePercent / 100
  const volumeMm3 = file.volumeMm3 * k ** 3
  const bbox = bboxOf(file)?.map((d) => d * k) as [number, number, number] | undefined
  // the shop shows the price for delivery within Türkiye; checkout recomputes for the real address
  const shippingMinor = shipping?.perUnitMinor({
    country: 'TR',
    gramsPerUnit: estimateGrams(volumeMm3, material),
    bboxMm: bbox ?? null,
    quantity: 1,
  })
  return calculatePrice({
    volumeMm3,
    material,
    pricePerGramMinor: reference.pricePerGramMinor,
    quantity: 1,
    sellerMarginBps: product.marginBps,
    shippingMinor,
  }).unitPriceMinor
}

/**
 * Public catalogue. A product is listed only when it is active, its catalog entry is active and
 * has an analyzed, printable model. Nothing about manufacturers ever appears here.
 */
export default class StorefrontService {
  private visible() {
    return SellerProduct.query()
      .where('seller_products.status', 'active')
      .join('catalog_products', 'catalog_products.id', 'seller_products.catalog_product_id')
      .join('model_files', 'model_files.id', 'catalog_products.model_file_id')
      .where('catalog_products.is_active', true)
      .where('model_files.analysis_status', 'done')
      .where('model_files.is_printable', true)
      .whereNull('model_files.blocked_at')
      .preload('catalogProduct', (q) => q.preload('modelFile').preload('category'))
  }

  async list(filters: StorefrontFilters = {}) {
    const query = this.visible().select('seller_products.*')

    const q = filters.q?.trim()
    if (q) {
      query
        .whereRaw(`seller_products.search_vector @@ websearch_to_tsquery('simple', ?)`, [q])
        .orderByRaw(
          `ts_rank(seller_products.search_vector, websearch_to_tsquery('simple', ?)) desc`,
          [q]
        )
    }
    if (filters.material) {
      query.whereRaw('catalog_products.allowed_materials @> ?::jsonb', [
        JSON.stringify([filters.material.toUpperCase()]),
      ])
    }
    if (filters.category) {
      query.whereExists((sub) =>
        sub
          .from('categories')
          .whereColumn('categories.id', 'catalog_products.category_id')
          .where('categories.slug', filters.category!)
          .where('categories.is_active', true)
      )
    }
    if (filters.tag) {
      query.whereRaw('catalog_products.tags @> ?::jsonb', [
        JSON.stringify([filters.tag.toLowerCase()]),
      ])
    }
    query.orderBy('seller_products.id', 'desc').limit(MAX_CANDIDATES)

    const rows = await query
    const shipping = await new ShippingService().table()
    let cards = rows.flatMap((p) => {
      const card = this.toCard(p, shipping, filters.material)
      return card ? [card] : []
    })

    if (filters.minPriceMinor !== undefined) {
      cards = cards.filter((c) => c.fromPriceMinor >= filters.minPriceMinor!)
    }
    if (filters.maxPriceMinor !== undefined) {
      cards = cards.filter((c) => c.fromPriceMinor <= filters.maxPriceMinor!)
    }
    if (filters.sort === 'price_asc') cards.sort((a, b) => a.fromPriceMinor - b.fromPriceMinor)
    if (filters.sort === 'price_desc') cards.sort((a, b) => b.fromPriceMinor - a.fromPriceMinor)

    const perPage = Math.min(Math.max(filters.perPage ?? 12, 1), 48)
    const page = Math.max(filters.page ?? 1, 1)
    return {
      items: cards.slice((page - 1) * perPage, page * perPage),
      total: cards.length,
      page,
      perPage,
    }
  }

  /** Active categories that hold at least one visible product, for the filter chips. */
  async categoriesInUse() {
    const result = await db.rawQuery(
      `select distinct c.slug, c.name
         from seller_products sp
         join catalog_products cp on cp.id = sp.catalog_product_id
         join model_files mf on mf.id = cp.model_file_id
         join categories c on c.id = cp.category_id
        where sp.status = 'active' and cp.is_active and c.is_active
          and mf.analysis_status = 'done' and mf.is_printable and mf.blocked_at is null
        order by c.name`
    )
    return result.rows as Array<{ slug: string; name: string }>
  }

  async find(id: number): Promise<StorefrontDetail | null> {
    const product = await this.visible()
      .where('seller_products.id', id)
      .select('seller_products.*')
      .first()
    if (!product) return null
    const shipping = await new ShippingService().table()
    const card = this.toCard(product, shipping)
    const file = product.catalogProduct.modelFile
    if (!card || !file) return null

    const scales = product.catalogProduct.allowedScales ?? [100]
    const options = scales.flatMap((scalePercent) =>
      card.materials.flatMap((material) => {
        const unitPriceMinor = unitPriceFor(product, file, material, shipping, scalePercent)
        return unitPriceMinor === null ? [] : [{ material, scalePercent, unitPriceMinor }]
      })
    )
    return {
      ...card,
      scales,
      options,
      updatedAt: product.updatedAt.toISO()!,
    }
  }

  /** Ids + timestamps for sitemap.xml. */
  async sitemapEntries(): Promise<Array<{ id: number; slug: string; updatedAt: string }>> {
    const rows = await this.visible()
      .select('seller_products.*')
      .orderBy('seller_products.id', 'asc')
    return rows.map((p) => ({ id: p.id, slug: slugify(p.title), updatedAt: p.updatedAt.toISO()! }))
  }

  private toCard(
    product: SellerProduct,
    shipping: ShippingTable,
    preferredMaterial?: string
  ): StorefrontCard | null {
    const catalog = product.catalogProduct
    const file = catalog.modelFile
    if (!file) return null
    const materials = catalog.allowedMaterials.map((m) => m.toUpperCase())
    const prices = materials
      .map((m) => ({ m, price: unitPriceFor(product, file, m, shipping) }))
      .filter((x): x is { m: string; price: number } => x.price !== null)
    if (prices.length === 0) return null

    const focus = preferredMaterial?.toUpperCase()
    const shown =
      prices.find((x) => x.m === focus)?.price ?? Math.min(...prices.map((x) => x.price))
    return {
      id: product.id,
      slug: slugify(product.title),
      title: product.title,
      description: product.description,
      materials: prices.map((x) => x.m),
      category: catalog.category?.isActive
        ? { slug: catalog.category.slug, name: catalog.category.name }
        : null,
      tags: catalog.tags ?? [],
      fromPriceMinor: shown,
      currency: product.currency,
      bboxMm:
        file.bboxXMm !== null && file.bboxYMm !== null && file.bboxZMm !== null
          ? [file.bboxXMm, file.bboxYMm, file.bboxZMm]
          : null,
    }
  }
}
