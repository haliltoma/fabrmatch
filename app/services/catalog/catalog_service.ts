import CatalogProduct from '#models/catalog_product'
import string from '@adonisjs/core/helpers/string'

interface CreateCatalogData {
  title: string
  description?: string | null
  modelFileId?: number | null
  allowedMaterials: string[]
  categoryId?: number | null
  tags?: string[]
  allowedScales?: number[]
}

/** Lower-case, trimmed, de-duplicated, at most 8: tags are filter keys, not free prose. */
export function normaliseTags(tags: string[] | undefined): string[] {
  return [
    ...new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2)),
  ].slice(0, 8)
}

/** Always includes 100 (the original size); sorted, unique. */
export function normaliseScales(scales: number[] | undefined): number[] {
  return [...new Set([100, ...(scales ?? [])])]
    .filter((n) => Number.isInteger(n) && n >= 10 && n <= 300)
    .sort((a, b) => a - b)
}

export default class CatalogService {
  async create(data: CreateCatalogData): Promise<CatalogProduct> {
    const slug = string.slug(data.title, { lower: true })

    const existing = await CatalogProduct.findBy('slug', slug)
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    return CatalogProduct.create({
      title: data.title,
      slug: finalSlug,
      description: data.description ?? null,
      modelFileId: data.modelFileId ?? null,
      allowedMaterials: data.allowedMaterials,
      categoryId: data.categoryId ?? null,
      tags: normaliseTags(data.tags),
      allowedScales: normaliseScales(data.allowedScales),
    })
  }

  async update(product: CatalogProduct, data: Partial<CreateCatalogData>): Promise<CatalogProduct> {
    if (data.title) {
      product.title = data.title
    }
    if (data.description !== undefined) {
      product.description = data.description ?? null
    }
    if (data.modelFileId !== undefined) {
      product.modelFileId = data.modelFileId ?? null
    }
    if (data.categoryId !== undefined) product.categoryId = data.categoryId ?? null
    if (data.allowedScales) product.allowedScales = normaliseScales(data.allowedScales)
    if (data.tags) product.tags = normaliseTags(data.tags)
    if (data.allowedMaterials) {
      product.allowedMaterials = data.allowedMaterials
    }
    await product.save()
    return product
  }

  async toggleActive(product: CatalogProduct): Promise<void> {
    product.isActive = !product.isActive
    await product.save()
  }

  async listAll(): Promise<CatalogProduct[]> {
    return CatalogProduct.query().orderBy('title', 'asc')
  }

  async listActive(): Promise<CatalogProduct[]> {
    return CatalogProduct.query().where('isActive', true).orderBy('title', 'asc')
  }

  async findById(id: number): Promise<CatalogProduct | null> {
    return CatalogProduct.find(id)
  }

  async findBySlug(slug: string): Promise<CatalogProduct | null> {
    return CatalogProduct.findBy('slug', slug)
  }
}
