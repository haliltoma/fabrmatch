import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ReferenceCatalogService from '#services/catalog/reference_catalog_service'

const materialValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(32),
  name: vine.string().trim().minLength(1).maxLength(80),
  technology: vine.enum(['FDM', 'SLA', 'SLS'] as const),
})
const colorValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(40),
  hex: vine
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/),
})
const toggleValidator = vine.create({ isActive: vine.boolean() })

const BACK = '/admin/materials'

export default class AdminReferenceCatalogController {
  async index({ inertia }: HttpContext) {
    const catalog = new ReferenceCatalogService()
    const [materials, colors] = await Promise.all([catalog.listMaterials(), catalog.listColors()])
    return inertia.render('admin/materials/index', {
      materials: materials.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        technology: m.technology,
        isActive: m.isActive,
      })),
      colors: colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex, isActive: c.isActive })),
    })
  }

  async storeMaterial({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(materialValidator)
    await new ReferenceCatalogService().createMaterial(data, auth.getUserOrFail().id)
    session.flash('success', 'Material added.')
    return response.redirect().toPath(BACK)
  }

  async storeColor({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(colorValidator)
    await new ReferenceCatalogService().createColor(data, auth.getUserOrFail().id)
    session.flash('success', 'Colour added.')
    return response.redirect().toPath(BACK)
  }

  async toggleMaterial({ params, request, response, auth }: HttpContext) {
    const { isActive } = await request.validateUsing(toggleValidator)
    await new ReferenceCatalogService().setMaterialActive(
      params.id,
      isActive,
      auth.getUserOrFail().id
    )
    return response.redirect().toPath(BACK)
  }

  async toggleColor({ params, request, response, auth }: HttpContext) {
    const { isActive } = await request.validateUsing(toggleValidator)
    await new ReferenceCatalogService().setColorActive(params.id, isActive, auth.getUserOrFail().id)
    return response.redirect().toPath(BACK)
  }
}
