import { BaseTransformer } from '@adonisjs/core/transformers'
import type Dispute from '#models/dispute'
import OrderTransformer from '#transformers/order_transformer'
import { maskedText } from '#services/messaging/contact_filter'

/** `mask`: contact details hidden, as for the buyer and maker (only the admin sees raw text). */
function evidenceOf(dispute: Dispute, buyerId: number | null, mask = true) {
  return (dispute.evidence ?? []).map((e) => ({
    id: e.id,
    note: mask ? maskedText(e.note) : e.note,
    // Roles, never identities: who uploaded is only "buyer" or "manufacturer".
    by: e.uploaderId === buyerId ? ('buyer' as const) : ('manufacturer' as const),
    createdAt: e.createdAt.toISO(),
  }))
}

/**
 * Anonymity (PRD §9): the buyer-facing default shows the manufacturer's written response but
 * nothing that identifies them; the manufacturer view has no buyer identity or admin notes.
 * Free text is shown with contact details masked, like order messages; the admin sees it raw.
 */
export default class DisputeTransformer extends BaseTransformer<Dispute> {
  toObject() {
    return this.shared(true)
  }

  private shared(mask: boolean) {
    const d = this.resource
    return {
      id: d.id,
      orderId: d.orderId,
      status: d.status,
      reason: mask ? (maskedText(d.reason) ?? '') : d.reason,
      manufacturerResponse: mask ? maskedText(d.manufacturerResponse) : d.manufacturerResponse,
      resolution: d.resolution,
      refundMinor: d.refundMinor,
      resolvedAt: d.resolvedAt?.toISO() ?? null,
      createdAt: d.createdAt.toISO(),
      evidence: evidenceOf(d, d.openedBy, mask),
    }
  }

  forManufacturer() {
    const d = this.resource
    return {
      id: d.id,
      status: d.status,
      reason: maskedText(d.reason) ?? '',
      manufacturerResponse: maskedText(d.manufacturerResponse),
      resolution: d.resolution,
      refundMinor: d.refundMinor,
      createdAt: d.createdAt.toISO(),
      evidence: evidenceOf(d, d.openedBy),
    }
  }

  forAdmin() {
    const d = this.resource
    return {
      ...this.shared(false),
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
