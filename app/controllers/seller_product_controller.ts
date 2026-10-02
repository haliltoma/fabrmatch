import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import drive from '@adonisjs/drive/services/main'
import string from '@adonisjs/core/helpers/string'
import { zipSync, type Zippable } from 'fflate'
import ProductImage from '#models/product_image'
import Category from '#models/category'
import Material from '#models/material'
import SellerProductService from '#services/catalog/seller_product_service'
import SellerDesignService from '#services/catalog/seller_design_service'
import ProductImageService from '#services/catalog/product_image_service'
import OrderService from '#services/orders/order_service'
import { sampleOrderValidator } from '#validators/order'
import CatalogService from '#services/catalog/catalog_service'
import SellerProductCardTransformer from '#transformers/seller_product_card_transformer'
import {
  createSellerDesignValidator,
  createSellerProductValidator,
  updateSellerProductValidator,
} from '#validators/seller_product'

export default class SellerProductController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const products = await new SellerProductService().listForProfile(user.sellerProfile.id)
    const fileIds = products.flatMap((p) =>
      p.catalogProduct?.modelFileId ? [p.catalogProduct.modelFileId] : []
    )
    const images = await new ProductImageService().forModelFiles(fileIds)
    const shopRows =
      products.length === 0
        ? []
        : await db
            .from('external_listings as l')
            .join('store_connections as c', 'c.id', 'l.store_connection_id')
            .whereIn(
              'l.seller_product_id',
              products.map((p) => p.id)
            )
            .where('l.published', true)
            .where('c.seller_user_id', user.id)
            .whereNot('c.status', 'disconnected')
            .distinct('l.seller_product_id', 'c.id', 'c.shop_name', 'c.provider')
    const shopsOf = new Map<
      string,
      Array<{ connectionId: string; shopName: string; provider: string }>
    >()
    for (const r of shopRows) {
      const list = shopsOf.get(r.seller_product_id) ?? []
      list.push({ connectionId: r.id, shopName: r.shop_name ?? r.provider, provider: r.provider })
      shopsOf.set(r.seller_product_id, list)
    }

    const [catalogProducts, files, materials, categories] = await Promise.all([
      new CatalogService().listActive(),
      new SellerDesignService().eligibleFiles(user),
      Material.query().where('isActive', true).orderBy('code'),
      Category.query().where('isActive', true).orderBy('name'),
    ])

    return inertia.render('seller/products/index', {
      products: await SellerProductCardTransformer.transform(
        products.map((product) => ({
          product,
          images: product.catalogProduct?.modelFileId
            ? (images.get(product.catalogProduct.modelFileId) ?? [])
            : [],
          shops: shopsOf.get(product.id) ?? [],
        }))
      ).resolve(app.container.createResolver(), 0),
      catalogProducts: catalogProducts.map((c) => ({
        id: c.id,
        title: c.title,
        allowedMaterials: c.allowedMaterials,
      })),
      designFiles: files.map((f) => ({
        id: f.id,
        name: f.originalName,
        sizeMm: [f.bboxXMm, f.bboxYMm, f.bboxZMm].map((n) => (n === null ? null : Number(n))),
        createdAt: f.createdAt.toISO(),
      })),
      materials: materials.map((m) => ({ code: m.code.toUpperCase(), name: m.name })),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    })
  }

  async sample({ request, response, auth, params }: HttpContext) {
    const data = await request.validateUsing(sampleOrderValidator)
    const order = await new OrderService().createSampleDraft(auth.getUserOrFail(), params.id, data)
    return response.redirect().toRoute('order.show', { id: order.id })
  }

  /** A product on a platform catalogue design. */
  async store({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(createSellerProductValidator)
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const catalogProduct = await new CatalogService().findPlatform(data.catalogProductId)
    if (!catalogProduct || !catalogProduct.isActive) {
      session.flash('error', 'Catalog product not found.')
      return response.redirect().toPath('/seller/products')
    }
    await new SellerProductService().createFromCatalog(user.sellerProfile, catalogProduct, data)

    session.flash('success', 'Product created.')
    return response.redirect().toPath('/seller/products')
  }

  /** W1: a product from the seller's own uploaded model. */
  async storeDesign({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(createSellerDesignValidator)
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    await new SellerDesignService().create(user, user.sellerProfile, data)
    session.flash('success', 'Product created. Its pictures are ready in a minute.')
    return response.redirect().toPath('/seller/products')
  }

  async update({ request, response, auth, params, session }: HttpContext) {
    const { materials, scales, tags, ...data } = await request.validateUsing(
      updateSellerProductValidator
    )
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const service = new SellerProductService()
    const product = await service.findForProfile(params.id, user.sellerProfile.id)
    if (!product) {
      session.flash('error', 'Product not found.')
      return response.redirect().toPath('/seller/products')
    }

    await new SellerDesignService().updateDesign(user, product, { materials, scales, tags })
    await service.update(product, data)
    session.flash('success', 'Product updated.')
    return response.redirect().toPath('/seller/products')
  }

  /** W2: every approved picture of the seller's product in one ZIP, for their own site. */
  async images({ response, auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    const product = await new SellerProductService().findForProfile(
      params.id,
      user.sellerProfile.id
    )
    const fileId = product?.catalogProduct?.modelFileId
    if (!product || !fileId) return response.notFound()
    const rows = await ProductImage.query()
      .where('modelFileId', fileId)
      .where('status', 'approved')
      .orderByRaw("case when kind = 'maker_photo' then 0 else 1 end")
      .orderBy('angle', 'asc')
      .orderBy('id', 'asc')
      .limit(30)
    if (rows.length === 0) return response.notFound()

    const name = string.slug(product.title, { lower: true }).slice(0, 60) || 'product'
    const files: Zippable = {}
    let n = 0
    for (const row of rows) {
      n++
      const ext =
        row.contentType === 'image/jpeg' ? 'jpg' : row.contentType === 'image/webp' ? 'webp' : 'png'
      const label = row.kind === 'render' ? `render-${row.angle ?? n}` : `photo-${n}`
      // pictures are compressed already: store them as they are
      files[`${name}-${label}.${ext}`] = [
        await drive.use('s3').getBytes(row.storageKey),
        { level: 0 },
      ]
    }
    response.header('Content-Type', 'application/zip')
    response.header('Content-Disposition', `attachment; filename="${name}-pictures.zip"`)
    response.header('Cache-Control', 'private, no-store')
    return response.send(Buffer.from(zipSync(files)))
  }

  async setStatus({ request, response, auth, params, session }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const service = new SellerProductService()
    const product = await service.findForProfile(params.id, user.sellerProfile.id)
    if (!product) {
      session.flash('error', 'Product not found.')
      return response.redirect().toPath('/seller/products')
    }

    const status = request.input('status')
    if (!['draft', 'active', 'archived'].includes(status)) {
      session.flash('error', 'Invalid status.')
      return response.redirect().toPath('/seller/products')
    }

    await service.setStatus(product, status)
    // a retired product must not keep selling in the seller's own shops
    if (status === 'archived') {
      const { default: StoreService } = await import('#services/integrations/stores/store_service')
      const { failed } = await new StoreService().unpublish(user, product.id)
      if (failed.length > 0) {
        session.flash('error', `Archived, but still on sale in: ${failed.join(' ')}`)
        return response.redirect().toPath('/seller/products')
      }
    }
    session.flash('success', `Product set to ${status}.`)
    return response.redirect().toPath('/seller/products')
  }
}
