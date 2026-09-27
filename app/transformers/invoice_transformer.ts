import { BaseTransformer } from '@adonisjs/core/transformers'
import type Invoice from '#models/invoice'

/** A buyer's own invoice in their history. Preload `order` for its code. */
export default class InvoiceTransformer extends BaseTransformer<Invoice> {
  toObject() {
    const i = this.resource
    return {
      id: i.id,
      number: i.number,
      orderId: i.orderId,
      orderCode: i.order?.code ?? null,
      status: i.status,
      issuedAt: i.issuedAt.toISO(),
      netMinor: i.netMinor,
      taxMinor: i.taxMinor,
      grossMinor: i.grossMinor,
      currency: i.currency,
    }
  }
}
