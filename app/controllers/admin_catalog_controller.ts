import type { HttpContext } from '@adonisjs/core/http'
import CategoryService from '#services/catalog/category_service'
import CatalogService from '#services/catalog/catalog_service'
import ModelFile from '#models/model_file'
import { createCatalogProductValidator, updateCatalogProductValidator } from '#validators/catalog'

/** Storefront orders are produced from this file, so it must be analyzed, printable and the admin's own. */
async function usableModelFile(fileId: number, adminId: number) {
  const file = await ModelFile.query()
    .where('id', fileId)
    .where('ownerId', adminId)
    .where('analysisStatus', 'done')
    .where('isPrintable', true)
    .first()
  return !!file
}

export default class AdminCatalogController {
  async index({ inertia, auth }: HttpContext) {
    const service = new CatalogService()
    const products = await service.listAll()
    const files = await ModelFile.query()
      .where('ownerId', auth.getUserOrFail().id)
      .where('analysisStatus', 'done')
      .where('isPrintable', true)
      .orderBy('createdAt', 'desc')

    const categoryRows = await new CategoryService().list()
    return inertia.render('admin/catalog/index', {
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        allowedMaterials: p.allowedMaterials,
        isActive: p.isActive,
        modelFileId: p.modelFileId,
        categoryId: p.categoryId,
        tags: p.tags ?? [],
      })),
      categories: categoryRows.map((c) => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
      })),
      modelFiles: files.map((f) => ({ id: f.id, name: f.originalName })),
    })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(createCatalogProductValidator)
    if (data.modelFileId && !(await usableModelFile(data.modelFileId, auth.getUserOrFail().id))) {
      session.flash('error', 'Model file must be one of your analyzed, printable files.')
      return response.redirect().toPath('/admin/catalog')
    }
    const service = new CatalogService()
    await service.create(data)

    session.flash('success', 'Catalog product created.')
    return response.redirect().toPath('/admin/catalog')
  }

  async update({ request, response, params, session, auth }: HttpContext) {
    const data = await request.validateUsing(updateCatalogProductValidator)
    if (data.modelFileId && !(await usableModelFile(data.modelFileId, auth.getUserOrFail().id))) {
      session.flash('error', 'Model file must be one of your analyzed, printable files.')
      return response.redirect().toPath('/admin/catalog')
    }
    const service = new CatalogService()
    const product = await service.findById(params.id)

    if (!product) {
      session.flash('error', 'Product not found.')
      return response.redirect().toPath('/admin/catalog')
    }

    await service.update(product, data)
    session.flash('success', 'Product updated.')
    return response.redirect().toPath('/admin/catalog')
  }

  async toggleActive({ response, params, session }: HttpContext) {
    const service = new CatalogService()
    const product = await service.findById(params.id)

    if (!product) {
      session.flash('error', 'Product not found.')
      return response.redirect().toPath('/admin/catalog')
    }

    await service.toggleActive(product)
    session.flash('success', product.isActive ? 'Product activated.' : 'Product deactivated.')
    return response.redirect().toPath('/admin/catalog')
  }
}
