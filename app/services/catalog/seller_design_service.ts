import db from '@adonisjs/lucid/services/db'
import string from '@adonisjs/core/helpers/string'
import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import CatalogProduct from '#models/catalog_product'
import Category from '#models/category'
import Material from '#models/material'
import ModelFile from '#models/model_file'
import SellerProduct from '#models/seller_product'
import type SellerProfile from '#models/seller_profile'
import type User from '#models/user'
import { normaliseScales, normaliseTags } from '#services/catalog/catalog_service'

export class SellerDesignError extends DomainError {}

export interface SellerDesignInput {
  modelFileId: string
  title: string
  description?: string | null
  materials: string[]
  scales?: number[]
  categoryId?: string | null
  tags?: string[]
  marginBps?: number
  minMakerTier?: number
  shopListed?: boolean
}

/**
 * Paket W (W1), the Printify "upload your design" step: one of the seller's own analysed models
 * becomes a catalogue entry only they can sell (`owner_user_id`) and their product on it. The
 * file stays private; makers still get it only through an order's access grant (rule 4).
 */
export default class SellerDesignService {
  /** The seller's files that can become a product: analysed, printable, not blocked, unused. */
  async eligibleFiles(user: User) {
    return ModelFile.query()
      .where('ownerId', user.id)
      .where('analysisStatus', 'done')
      .where('isPrintable', true)
      .whereNull('blockedAt')
      .whereNotExists((q) =>
        q
          .from('catalog_products')
          .whereColumn('catalog_products.model_file_id', 'model_files.id')
          .where('catalog_products.owner_user_id', user.id)
      )
      .orderBy('createdAt', 'desc')
      .limit(100)
  }

  async create(user: User, profile: SellerProfile, input: SellerDesignInput) {
    const file = await ModelFile.query()
      .where('id', input.modelFileId)
      .where('ownerId', user.id)
      .first()
    if (!file) throw new SellerDesignError('File not found', { status: 404 })
    if (file.blockedAt) throw new SellerDesignError('This file was blocked and cannot be sold')
    if (file.analysisStatus !== 'done') {
      throw new SellerDesignError('Wait until the file check has finished')
    }
    if (!file.isPrintable) {
      throw new SellerDesignError('This model cannot be printed as it is; fix it and upload again')
    }

    const materials = await this.validMaterials(input.materials)
    await this.assertCategory(input.categoryId)
    const existing = await CatalogProduct.query()
      .where('modelFileId', file.id)
      .where('ownerUserId', user.id)
      .first()
    if (existing) throw new SellerDesignError('You already made a product from this file')

    return db.transaction(async (trx) => {
      const slug = string.slug(input.title, { lower: true }).slice(0, 200) || 'design'
      const catalog = await CatalogProduct.create(
        {
          title: input.title,
          // the id makes it unique; a seller's title never takes a platform slug
          slug: `${slug}-${file.id.replaceAll('-', '').slice(-8)}`,
          description: input.description ?? null,
          modelFileId: file.id,
          allowedMaterials: materials,
          allowedScales: normaliseScales(input.scales),
          categoryId: input.categoryId ?? null,
          tags: normaliseTags(input.tags),
          ownerUserId: user.id,
        },
        { client: trx }
      )
      const product = await SellerProduct.create(
        {
          sellerProfileId: profile.id,
          catalogProductId: catalog.id,
          title: input.title,
          description: input.description ?? null,
          currency: 'TRY',
          marginBps: input.marginBps ?? profile.defaultMarginBps,
          minMakerTier: input.minMakerTier ?? 0,
          shopListed: input.shopListed ?? true,
        },
        { client: trx }
      )
      await AuditLog.create(
        {
          actorId: user.id,
          action: 'seller.design_created',
          subjectType: 'seller_product',
          subjectId: product.id,
          meta: { modelFileId: file.id, catalogProductId: catalog.id },
        },
        { client: trx }
      )
      return product
    })
  }

  /** Materials of the seller's own design: changed together with the product (owner only). */
  async updateDesign(
    user: User,
    product: SellerProduct,
    input: { materials?: string[]; scales?: number[]; tags?: string[]; categoryId?: string | null }
  ) {
    const catalog = product.catalogProduct
    if (!catalog || catalog.ownerUserId !== user.id) return
    if (input.materials) catalog.allowedMaterials = await this.validMaterials(input.materials)
    if (input.scales) catalog.allowedScales = normaliseScales(input.scales)
    if (input.tags) catalog.tags = normaliseTags(input.tags)
    if (input.categoryId !== undefined) {
      await this.assertCategory(input.categoryId)
      catalog.categoryId = input.categoryId
    }
    await catalog.save()
  }

  private async assertCategory(categoryId: string | null | undefined) {
    if (!categoryId) return
    const category = await Category.query().where('id', categoryId).where('isActive', true).first()
    if (!category) throw new SellerDesignError('Choose one of the listed categories')
  }

  private async validMaterials(requested: string[]) {
    const codes = [...new Set(requested.map((m) => m.trim().toUpperCase()))]
    if (codes.length === 0) throw new SellerDesignError('Choose at least one material')
    const active = await Material.query().where('isActive', true).whereIn('code', codes)
    const known = new Set(active.map((m) => m.code.toUpperCase()))
    const unknown = codes.filter((c) => !known.has(c))
    if (unknown.length > 0) {
      throw new SellerDesignError(`Unknown material: ${unknown.join(', ')}`)
    }
    return codes
  }
}
