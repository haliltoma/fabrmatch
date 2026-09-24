import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import CategoryService from '#services/catalog/category_service'

const createValidator = vine.create({ name: vine.string().trim().maxLength(80) })
const toggleValidator = vine.create({ isActive: vine.boolean() })

export default class AdminCategoryController {
  async store({ request, response, session, auth }: HttpContext) {
    const { name } = await request.validateUsing(createValidator)
    await new CategoryService().create(name, auth.getUserOrFail().id)
    session.flash('success', 'Category added.')
    return response.redirect().toPath('/admin/catalog')
  }

  async toggle({ params, request, response, auth }: HttpContext) {
    const { isActive } = await request.validateUsing(toggleValidator)
    await new CategoryService().setActive(Number(params.id), isActive, auth.getUserOrFail().id)
    return response.redirect().toPath('/admin/catalog')
  }
}
