import { BaseTransformer } from '@adonisjs/core/transformers'
import type Payout from '#models/payout'
import type PayoutDocument from '#models/payout_document'

function documentOf(document: PayoutDocument | null | undefined) {
  if (!document) return null
  return {
    id: document.id,
    kind: document.kind,
    number: document.number,
    issuedOn: document.issuedOn.toISODate(),
    grossMinor: document.grossMinor,
    vatMinor: document.vatMinor,
    withholdingMinor: document.withholdingMinor,
    status: document.status,
    rejectionReason: document.rejectionReason,
    hasFile: !!document.fileKey,
  }
}

/**
 * Payouts under sales model B. Preload `order` and `document`. The payee sees their own amounts
 * and document state; the admin list adds who it is for. Never the buyer.
 */
export default class PayoutTransformer extends BaseTransformer<Payout> {
  toObject() {
    const p = this.resource
    return {
      id: p.id,
      orderCode: p.order?.code ?? null,
      status: p.status,
      taxStatus: p.taxStatus,
      grossMinor: p.grossMinor ?? p.amountMinor,
      vatMinor: p.vatMinor,
      withholdingMinor: p.withholdingMinor,
      amountMinor: p.amountMinor,
      currency: p.currency,
      paidAt: p.paidAt?.toISO() ?? null,
      document: documentOf(p.document),
    }
  }

  forAdmin() {
    const p = this.resource
    return {
      ...this.toObject(),
      beneficiaryType: p.beneficiaryType,
      beneficiaryId: p.beneficiaryId,
      paidReference: p.paidReference,
    }
  }
}
