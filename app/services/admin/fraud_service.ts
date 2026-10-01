import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import FraudFlag from '#models/fraud_flag'
import Order from '#models/order'
import User from '#models/user'

export class FraudError extends DomainError {}

interface Finding {
  rule: string
  severity: 'review' | 'hold'
  detail: string
}

/**
 * Simple, explainable rules run when an order is paid. A "hold" keeps the order out of matching
 * until an admin clears or rejects it; a "review" only lands in the admin queue. Card-level
 * checks (same card on many accounts) need the provider's card fingerprint and come with iyzico.
 */
export default class FraudService {
  async assess(orderId: string, now: DateTime = DateTime.now()): Promise<{ hold: boolean }> {
    const order = await Order.findOrFail(orderId)
    const findings = [
      ...(await this.newAccountHighValue(order, now)),
      ...(await this.selfDealing(order)),
      ...(await this.sharedAddress(order)),
      ...(await this.velocity(order, now)),
    ]
    for (const f of findings) {
      await db
        .table('fraud_flags')
        .insert({
          order_id: orderId,
          rule: f.rule,
          severity: f.severity,
          detail: f.detail,
          status: 'open',
          created_at: new Date(),
        })
        .onConflict(['order_id', 'rule'])
        .ignore()
    }
    const open = await FraudFlag.query()
      .where('orderId', orderId)
      .where('status', 'open')
      .where('severity', 'hold')
      .first()
    return { hold: !!open }
  }

  async listOpen() {
    const flags = await FraudFlag.query().where('status', 'open').orderBy('id', 'asc')
    const orders = await Order.query().whereIn('id', [...new Set(flags.map((f) => f.orderId))])
    const byId = new Map(orders.map((o) => [o.id, o]))
    const grouped = new Map<string, FraudFlag[]>()
    for (const f of flags) grouped.set(f.orderId, [...(grouped.get(f.orderId) ?? []), f])
    return [...grouped.entries()].map(([orderId, list]) => {
      const order = byId.get(orderId)!
      return {
        orderId,
        orderCode: order.code,
        status: order.status,
        totalMinor: order.totalMinor,
        currency: order.currency,
        holding: list.some((f) => f.severity === 'hold'),
        flags: list.map((f) => ({ rule: f.rule, severity: f.severity, detail: f.detail })),
      }
    })
  }

  /** Marks every open flag of the order cleared. Returns true when matching may now start. */
  async clear(orderId: string, adminId: string): Promise<boolean> {
    const changed = await this.resolve(orderId, 'cleared', adminId)
    const order = await Order.findOrFail(orderId)
    return changed > 0 && order.status === 'paid'
  }

  async reject(orderId: string, adminId: string) {
    const changed = await this.resolve(orderId, 'rejected', adminId)
    if (changed === 0) throw new FraudError('Nothing to reject: no open flags on this order')
  }

  private async resolve(orderId: string, status: 'cleared' | 'rejected', adminId: string) {
    const updated = await FraudFlag.query()
      .where('orderId', orderId)
      .where('status', 'open')
      .update({ status, resolvedBy: adminId, resolvedAt: DateTime.now().toSQL() })
      .returning('id')
    if (updated.length > 0) {
      await AuditLog.create({
        actorId: adminId,
        action: `fraud.${status}`,
        subjectType: 'order',
        subjectId: orderId,
        meta: { flags: updated.length },
      })
    }
    return updated.length
  }

  private async newAccountHighValue(order: Order, now: DateTime): Promise<Finding[]> {
    const rules = fabrmatchConfig.fraud
    const buyer = await User.findOrFail(order.buyerId)
    const young = buyer.createdAt > now.minus({ hours: rules.newAccountHours })
    if (!young || order.baseTotalMinor <= rules.newAccountMaxOrderMinor) return []
    return [
      {
        rule: 'new_account_high_value',
        severity: 'hold',
        detail: `Account is under ${rules.newAccountHours} h old and the order is ${(order.totalMinor / 100).toFixed(2)} ${order.currency}`,
      },
    ]
  }

  /** Buyer and seller of a storefront order signing in from the same address. */
  private async selfDealing(order: Order): Promise<Finding[]> {
    if (!order.sellerId || order.sellerId === order.buyerId) return []
    const shared = await this.sharedIps(order.buyerId, [order.sellerId])
    return shared.length === 0
      ? []
      : [
          {
            rule: 'buyer_seller_same_address',
            severity: 'hold',
            detail: 'Buyer and the seller of this order use the same network address',
          },
        ]
  }

  /** Several other buyers with paid orders behind the same address. */
  private async sharedAddress(order: Order): Promise<Finding[]> {
    const rows = await db.rawQuery(
      `select count(distinct s2.user_id) as n
         from user_sessions s1
         join user_sessions s2 on s2.ip_address = s1.ip_address and s2.user_id <> s1.user_id
         join orders o on o.buyer_id = s2.user_id and o.status not in ('draft', 'cancelled')
        where s1.user_id = ? and s1.ip_address is not null`,
      [order.buyerId]
    )
    const others = Number(rows.rows[0]?.n ?? 0)
    return others >= 2
      ? [
          {
            rule: 'shared_address_accounts',
            severity: 'review',
            detail: `${others} other buyer accounts with orders share this buyer's network address`,
          },
        ]
      : []
  }

  private async velocity(order: Order, now: DateTime): Promise<Finding[]> {
    const limit = fabrmatchConfig.fraud.ordersPerHour
    const row = await Order.query()
      .where('buyerId', order.buyerId)
      .whereNotIn('status', ['draft', 'awaiting_payment', 'cancelled'])
      .where('updatedAt', '>=', now.minus({ hours: 1 }).toSQL()!)
      .count('* as n')
      .first()
    const count = Number(row?.$extras.n ?? 0)
    return count >= limit
      ? [
          {
            rule: 'order_velocity',
            severity: 'review',
            detail: `${count} paid orders from this buyer in the last hour`,
          },
        ]
      : []
  }

  private async sharedIps(userId: string, others: Array<string | null>): Promise<string[]> {
    const rows = await db.rawQuery(
      `select distinct s1.ip_address
         from user_sessions s1
         join user_sessions s2 on s2.ip_address = s1.ip_address
        where s1.user_id = ? and s2.user_id = any(?) and s1.ip_address is not null`,
      [userId, others]
    )
    return rows.rows.map((r: { ip_address: string }) => r.ip_address)
  }
}
