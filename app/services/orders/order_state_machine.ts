import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Order from '#models/order'
import type { OrderStatus } from '#models/order'
import AuditLog from '#models/audit_log'
import ReferralService from '#services/growth/referral_service'
import WebhookService from '#services/integrations/webhook_service'

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  // paid/matching/unmatched may be cancelled (with refund) until a maker has accepted the job
  paid: ['matching', 'cancelled'],
  matching: ['in_production', 'unmatched', 'cancelled'],
  unmatched: ['matching', 'cancelled'],
  in_production: ['shipped', 'matching'],
  shipped: ['delivered'],
  delivered: ['completed', 'disputed'],
  // disputed → matching only through an admin "reprint" decision
  disputed: ['resolved', 'matching'],
  resolved: [],
  completed: [],
  cancelled: [],
}

export class InvalidOrderTransitionError extends DomainError {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus
  ) {
    super(`Invalid order transition: ${from} → ${to}`)
  }
}

interface TransitionOptions {
  actorId?: string | null
  meta?: Record<string, unknown>
  trx?: TransactionClientContract
}

export default class OrderStateMachine {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ORDER_TRANSITIONS[from].includes(to)
  }

  /**
   * Locks the order row, validates the transition against the current DB state,
   * updates status and writes an audit log entry — all in one transaction.
   */
  async transition(
    orderId: string,
    to: OrderStatus,
    options: TransitionOptions = {}
  ): Promise<Order> {
    const run = async (trx: TransactionClientContract) => {
      const order = await Order.query({ client: trx })
        .where('id', orderId)
        .forUpdate()
        .firstOrFail()
      const from = order.status

      if (!OrderStateMachine.canTransition(from, to)) {
        throw new InvalidOrderTransitionError(from, to)
      }

      order.status = to
      if (to === 'delivered') order.deliveredAt = DateTime.now()
      if (to === 'completed') order.completedAt = DateTime.now()
      await order.useTransaction(trx).save()

      await AuditLog.create(
        {
          actorId: options.actorId ?? null,
          action: 'order.transition',
          subjectType: 'order',
          subjectId: order.id,
          meta: { from, to, ...options.meta },
        },
        { client: trx }
      )
      await new WebhookService().enqueueOrderStatusChange(order, from, trx)
      if (to === 'completed') await new ReferralService().rewardSafely(order, trx)

      return order
    }

    return options.trx ? run(options.trx) : db.transaction(run)
  }
}
