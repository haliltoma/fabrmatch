import { BaseTransformer } from '@adonisjs/core/transformers'
import type Dispute from '#models/dispute'
import OrderTransformer from '#transformers/order_transformer'

function evidenceOf(dispute: Dispute, buyerId: number | null) {
  return (dispute.evidence ?? []).map((e) => ({
    id: e.id,
    note: e.note,
    // Roles, never identities: who uploaded is only "buyer" or "manufacturer".
    by: e.uploaderId === buyerId ? ('buyer' as const) : ('manufacturer' as const),
    createdAt: e.createdAt.toISO(),
  }))
}

/**
 * Anonymity (PRD §9): the buyer-facing default shows the manufacturer's written response but
 * nothing that identifies them; the manufacturer view has no buyer identity or admin notes.
 */
export default class DisputeTransformer extends BaseTransformer<Dispute> {
  toObject() {
    const d = this.resource
    return {
      id: d.id,
      orderId: d.orderId,
      status: d.status,
      reason: d.reason,
      manufacturerResponse: d.manufacturerResponse,
      resolution: d.resolution,
      refundMinor: d.refundMinor,
      resolvedAt: d.resolvedAt?.toISO() ?? null,
      createdAt: d.createdAt.toISO(),
      evidence: evidenceOf(d, d.openedBy),
    }
  }

  forManufacturer() {
    const d = this.resource
    return {
      id: d.id,
      status: d.status,
      reason: d.reason,
      manufacturerResponse: d.manufacturerResponse,
      resolution: d.resolution,
      refundMinor: d.refundMinor,
      createdAt: d.createdAt.toISO(),
      evidence: evidenceOf(d, d.openedBy),
    }
  }

  forAdmin() {
    const d = this.resource
    return {
      ...this.toObject(),
      openedBy: d.openedBy,
      adminNote: d.adminNote,
      resolvedBy: d.resolvedBy,
      order: OrderTransformer.transform(d.order).useVariant('forAdmin'),
    }
  }

  forAdminList() {
    const d = this.resource
    return {
      id: d.id,
      status: d.status,
      resolution: d.resolution,
      orderCode: d.order.code,
      totalMinor: d.order.totalMinor,
      currency: d.order.currency,
      createdAt: d.createdAt.toISO(),
    }
  }
}
