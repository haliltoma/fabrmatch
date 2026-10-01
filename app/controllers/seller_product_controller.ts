import type { HttpContext } from '@adonisjs/core/http'
import SellerProductService from '#services/catalog/seller_product_service'
import OrderService from '#services/orders/order_service'
import { sampleOrderValidator } from '#validators/order'
import CatalogService from '#services/catalog/catalog_service'
import {
  createSellerProductValidator,
  updateSellerProductValidator,
} from '#validators/seller_product'

export default class SellerProductController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const service = new SellerProductService()
    const products = await service.listForProfile(user.sellerProfile.id)

    const catalogService = new CatalogService()
    const catalogProducts = await catalogService.listActive()

    return inertia.render('seller/products/index', {
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        currency: p.currency,
        marginBps: p.marginBps,
        status: p.status,
        catalogProduct: p.catalogProduct
          ? { id: p.catalogProduct.id, title: p.catalogProduct.title }
          : null,
      })),
      catalogProducts: catalogProducts.map((c) => ({
        id: c.id,
        title: c.title,
        allowedMaterials: c.allowedMaterials,
      })),
    })
  }

  async sample({ request, response, auth, params }: HttpContext) {
    const data = await request.validateUsing(sampleOrderValidator)
    const order = await new OrderService().createSampleDraft(auth.getUserOrFail(), params.id, data)
    return response.redirect().toRoute('order.show', { id: order.id })
  }

  async store({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(createSellerProductValidator)
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const service = new SellerProductService()

    if (data.catalogProductId) {
      const catalogService = new CatalogService()
      const catalogProduct = await catalogService.findById(data.catalogProductId)
      if (!catalogProduct) {
        session.flash('error', 'Catalog product not found.')
        return response.redirect().toPath('/seller/products')
      }
      await service.createFromCatalog(user.sellerProfile, catalogProduct, {
        currency: data.currency,
        marginBps: data.marginBps,
        minMakerTier: data.minMakerTier,
      })
    } else {
      await service.createCustom(user.sellerProfile, data)
    }

    session.flash('success', 'Product created.')
    return response.redirect().toPath('/seller/products')
  }

  async update({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(updateSellerProductValidator)
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')

    const service = new SellerProductService()
    const product = await service.findForProfile(params.id, user.sellerProfile.id)
    if (!product) {
      session.flash('error', 'Product not found.')
      return response.redirect().toPath('/seller/products')
    }

    await service.update(product, data)
    session.flash('success', 'Product updated.')
    return response.redirect().toPath('/seller/products')
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
