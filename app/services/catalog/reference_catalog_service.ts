import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import Color from '#models/color'
import Material from '#models/material'

export class ReferenceCatalogError extends DomainError {}

/** Admin-managed materials and colours. Makers pick from these; nothing is free text any more. */
export default class ReferenceCatalogService {
  async listMaterials(options: { activeOnly?: boolean } = {}) {
    const query = Material.query().orderBy('technology').orderBy('code')
    if (options.activeOnly) query.where('isActive', true)
    return query
  }

  async listColors(options: { activeOnly?: boolean } = {}) {
    const query = Color.query().orderBy('name')
    if (options.activeOnly) query.where('isActive', true)
    return query
  }

  async createMaterial(
    input: { code: string; name: string; technology: 'FDM' | 'SLA' | 'SLS' },
    adminId: number
  ) {
    const code = input.code.trim().toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) {
      throw new ReferenceCatalogError('Code may use letters, digits, - and _ (max 32)')
    }
    if (await Material.findBy('code', code)) {
      throw new ReferenceCatalogError(`Material ${code} already exists`)
    }
    const material = await Material.create({
      code,
      name: input.name.trim(),
      technology: input.technology,
      isActive: true,
    })
    await this.audit(adminId, 'catalog.material_created', material.id, { code })
    return material
  }

  async createColor(input: { name: string; hex: string }, adminId: number) {
    const name = input.name.trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(input.hex)) {
      throw new ReferenceCatalogError('Colour must be a hex value like #1E5FBF')
    }
    const clash = await db.from('colors').whereRaw('lower(name) = ?', [name.toLowerCase()]).first()
    if (clash) throw new ReferenceCatalogError(`Colour ${name} already exists`)
    const color = await Color.create({ name, hex: input.hex.toUpperCase(), isActive: true })
    await this.audit(adminId, 'catalog.color_created', color.id, { name })
    return color
  }

  /** Retired entries stay on existing offers but can no longer be picked. */
  async setMaterialActive(id: number, isActive: boolean, adminId: number) {
    const material = await Material.findOrFail(id)
    material.isActive = isActive
    await material.save()
    await this.audit(adminId, 'catalog.material_toggled', id, { code: material.code, isActive })
  }

  async setColorActive(id: number, isActive: boolean, adminId: number) {
    const color = await Color.findOrFail(id)
    color.isActive = isActive
    await color.save()
    await this.audit(adminId, 'catalog.color_toggled', id, { name: color.name, isActive })
  }

  /** Canonical code for a maker's pick; must exist, be active, and fit the printer technology. */
  async resolveMaterial(input: string, technology: string): Promise<string> {
    const material = await Material.query()
      .whereRaw('upper(code) = ?', [input.trim().toUpperCase()])
      .where('isActive', true)
      .first()
    if (!material) throw new ReferenceCatalogError(`"${input}" is not in the material catalogue`)
    if (material.technology !== technology) {
      throw new ReferenceCatalogError(
        `${material.code} is a ${material.technology} material; this printer is ${technology}`
      )
    }
    return material.code
  }

  async resolveColors(inputs: string[]): Promise<string[]> {
    const active = await this.listColors({ activeOnly: true })
    const byName = new Map(active.map((c) => [c.name.toLowerCase(), c.name]))
    const resolved: string[] = []
    for (const input of inputs) {
      const name = byName.get(input.trim().toLowerCase())
      if (!name) throw new ReferenceCatalogError(`"${input}" is not in the colour catalogue`)
      if (!resolved.includes(name)) resolved.push(name)
    }
    if (resolved.length === 0) throw new ReferenceCatalogError('Pick at least one colour')
    return resolved
  }

  private async audit(
    adminId: number,
    action: string,
    subjectId: number,
    meta: Record<string, unknown>
  ) {
    await AuditLog.create({ actorId: adminId, action, subjectType: 'catalog', subjectId, meta })
  }
}
