import DomainError from '#exceptions/domain_error'
import string from '@adonisjs/core/helpers/string'
import AuditLog from '#models/audit_log'
import Category from '#models/category'

export class CategoryError extends DomainError {}

export default class CategoryService {
  async list() {
    return Category.query().orderBy('name')
  }

  async create(name: string, adminId: string) {
    const trimmed = name.trim()
    if (trimmed.length < 2) throw new CategoryError('Give the category a name')
    const slug = string.slug(trimmed, { lower: true })
    if (!slug) throw new CategoryError('That name has no usable letters')
    if (await Category.findBy('slug', slug))
      throw new CategoryError(`Category "${trimmed}" already exists`)
    const category = await Category.create({ slug, name: trimmed, isActive: true })
    await AuditLog.create({
      actorId: adminId,
      action: 'catalog.category_created',
      subjectType: 'catalog',
      subjectId: category.id,
      meta: { slug },
    })
    return category
  }

  async setActive(id: string, isActive: boolean, adminId: string) {
    const category = await Category.findOrFail(id)
    category.isActive = isActive
    await category.save()
    await AuditLog.create({
      actorId: adminId,
      action: 'catalog.category_toggled',
      subjectType: 'catalog',
      subjectId: id,
      meta: { isActive },
    })
  }
}
