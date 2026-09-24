import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import { pageMeta, pageParams } from '#services/pagination'

export interface AuditFilters {
  /** exact action or a prefix ending in ".", e.g. "order." */
  action?: string
  subjectType?: string
  subjectId?: number
  actorId?: number
  from?: string
  to?: string
  page?: number
}

export default class AuditSearchService {
  async search(filters: AuditFilters) {
    const { page, perPage } = pageParams({ page: filters.page }, 50)
    const query = AuditLog.query().orderBy('id', 'desc')

    const action = filters.action?.trim()
    if (action) {
      if (action.endsWith('.'))
        query.whereILike('action', `${action.replaceAll(/[\\%_]/g, (c) => `\\${c}`)}%`)
      else query.where('action', action)
    }
    if (filters.subjectType) query.where('subjectType', filters.subjectType)
    if (filters.subjectId !== undefined) query.where('subjectId', filters.subjectId)
    if (filters.actorId !== undefined) query.where('actorId', filters.actorId)
    if (filters.from) {
      const from = DateTime.fromISO(filters.from).startOf('day')
      if (from.isValid) query.where('createdAt', '>=', from.toSQL()!)
    }
    if (filters.to) {
      const to = DateTime.fromISO(filters.to).endOf('day')
      if (to.isValid) query.where('createdAt', '<=', to.toSQL()!)
    }

    const paginator = await query.paginate(page, perPage)
    return {
      rows: paginator.all().map((a) => ({
        id: a.id,
        action: a.action,
        actorId: a.actorId,
        subjectType: a.subjectType,
        subjectId: a.subjectId,
        meta: JSON.stringify(a.meta ?? {}),
        createdAt: a.createdAt.toISO(),
      })),
      meta: pageMeta(paginator.total, page, perPage),
    }
  }
}
