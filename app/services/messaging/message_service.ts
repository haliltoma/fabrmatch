import DomainError from '#exceptions/domain_error'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import ManufacturerProfile from '#models/manufacturer_profile'
import Order from '#models/order'
import OrderMessage from '#models/order_message'
import ProductionJob from '#models/production_job'
import EncryptionService from '#services/identity/encryption_service'
import { maskContactDetails } from '#services/messaging/contact_filter'
import NotificationService from '#services/notifications/notification_service'

export class MessageError extends DomainError {}

export type Side = 'buyer' | 'maker'

const OPEN_STATUSES = ['in_production', 'shipped', 'delivered', 'disputed']
const MAX_LENGTH = 1500

/**
 * Buyer ↔ maker messages on one order. Neither side learns who the other is: messages carry only
 * the words "Buyer"/"Maker", and phone numbers, links, e-mails and payment details are masked
 * before storage. Admins alone can read what was originally typed.
 */
export default class MessageService {
  private encryption = new EncryptionService()

  /** Which side of the order this user is on, or null. Makers only count while their job is active. */
  async sideOf(orderId: number, userId: number): Promise<Side | null> {
    const order = await Order.find(orderId)
    if (!order) return null
    if (order.buyerId === userId) return 'buyer'
    const job = await ProductionJob.query()
      .where('orderId', orderId)
      .whereNot('status', 'cancelled')
      .first()
    if (!job) return null
    const profile = await ManufacturerProfile.find(job.manufacturerProfileId)
    return profile?.userId === userId ? 'maker' : null
  }

  async send(orderId: number, senderId: number, body: string): Promise<OrderMessage> {
    const side = await this.sideOf(orderId, senderId)
    if (!side) throw new MessageError('Order not found')
    const order = await Order.findOrFail(orderId)
    if (!OPEN_STATUSES.includes(order.status)) {
      throw new MessageError('Messages open once production starts')
    }
    const typed = body.trim()
    if (typed.length === 0) throw new MessageError('Write a message first')
    if (typed.length > MAX_LENGTH) throw new MessageError(`Keep it under ${MAX_LENGTH} characters`)

    const filtered = maskContactDetails(typed)
    const message = await OrderMessage.create({
      orderId,
      senderId,
      senderRole: side,
      body: filtered.text,
      originalEnc: filtered.maskedCount > 0 ? this.encryption.encrypt(typed) : null,
      maskedCount: filtered.maskedCount,
    })
    await this.notifyOther(order, side, message)
    return message
  }

  /** The thread as one side sees it; opening it marks the other side's messages read. */
  async thread(orderId: number, viewer: Side) {
    const rows = await OrderMessage.query().where('orderId', orderId).orderBy('id', 'asc')
    await OrderMessage.query()
      .where('orderId', orderId)
      .whereNot('senderRole', viewer)
      .whereNull('readAt')
      .update({ readAt: DateTime.now().toSQL() })
    return rows.map((m) => ({
      id: m.id,
      mine: m.senderRole === viewer,
      from: m.senderRole === 'buyer' ? 'Buyer' : 'Maker',
      body: m.body,
      masked: m.maskedCount > 0,
      createdAt: m.createdAt.toISO(),
    }))
  }

  async unreadFor(orderId: number, viewer: Side): Promise<number> {
    const row = await OrderMessage.query()
      .where('orderId', orderId)
      .whereNot('senderRole', viewer)
      .whereNull('readAt')
      .count('* as n')
      .first()
    return Number(row?.$extras.n ?? 0)
  }

  /** Admin view: masked text plus the original where something was hidden. */
  async threadForAdmin(orderId: number) {
    const rows = await OrderMessage.query().where('orderId', orderId).orderBy('id', 'asc')
    return rows.map((m) => ({
      id: m.id,
      from: m.senderRole === 'buyer' ? 'Buyer' : 'Maker',
      senderId: m.senderId,
      shown: m.body,
      original: m.originalEnc ? this.encryption.decrypt(m.originalEnc) : null,
      maskedCount: m.maskedCount,
      createdAt: m.createdAt.toISO(),
    }))
  }

  private async notifyOther(order: Order, from: Side, message: OrderMessage) {
    try {
      let recipient: number | null = null
      if (from === 'maker') recipient = order.buyerId
      else {
        const job = await ProductionJob.query()
          .where('orderId', order.id)
          .whereNot('status', 'cancelled')
          .first()
        const makerProfile = job ? await ManufacturerProfile.find(job.manufacturerProfileId) : null
        recipient = makerProfile?.userId ?? null
      }
      if (!recipient) return
      await new NotificationService().notify({
        userId: recipient,
        role: from === 'maker' ? 'buyer' : 'maker',
        type: 'message_received',
        context: { code: order.code, orderId: order.id },
        eventKey: `message_received:${message.id}`,
      })
    } catch (error) {
      logger.error({ msg: 'message notification failed', error: (error as Error).message })
    }
  }
}
