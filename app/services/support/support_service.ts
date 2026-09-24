import DomainError from '#exceptions/domain_error'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import SupportRequest from '#models/support_request'

export class SupportError extends DomainError {}

export const SUPPORT_TOPICS = ['order', 'payment', 'maker', 'seller', 'account', 'other'] as const
export type SupportTopic = (typeof SUPPORT_TOPICS)[number]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default class SupportService {
  async submit(input: {
    userId: number | null
    email: string
    topic: SupportTopic
    orderCode?: string | null
    message: string
  }) {
    const email = input.email.trim().toLowerCase()
    if (!EMAIL.test(email)) throw new SupportError('Enter a valid e-mail address')
    const message = input.message.trim()
    if (message.length < 10)
      throw new SupportError('Please tell us a little more (at least 10 characters)')

    return SupportRequest.create({
      userId: input.userId,
      email,
      topic: input.topic,
      orderCode: input.orderCode?.trim().toUpperCase().slice(0, 20) || null,
      message: message.slice(0, 2000),
      status: 'open',
    })
  }

  async listOpen() {
    const rows = await SupportRequest.query().where('status', 'open').orderBy('id', 'asc')
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      topic: r.topic,
      orderCode: r.orderCode,
      message: r.message,
      createdAt: r.createdAt.toISO(),
    }))
  }

  async markAnswered(id: number, adminId: number) {
    const changed = await SupportRequest.query()
      .where('id', id)
      .where('status', 'open')
      .update({ status: 'answered', answered_at: DateTime.now().toSQL() })
      .returning('id')
    if (changed.length === 0) throw new SupportError('Request not found')
    await AuditLog.create({
      actorId: adminId,
      action: 'support.answered',
      subjectType: 'support_request',
      subjectId: id,
      meta: {},
    })
  }
}
