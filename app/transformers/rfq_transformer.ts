import { BaseTransformer } from '@adonisjs/core/transformers'
import type Rfq from '#models/rfq'

/**
 * PRD §9 for requests for quotes: a maker sees the job and nothing about the buyer; the buyer sees
 * their own request. The model file itself is never included — makers get its size only.
 */
export default class RfqTransformer extends BaseTransformer<Rfq> {
  toObject() {
    return this.forBuyer()
  }

  forBuyer() {
    return {
      id: this.resource.id,
      code: this.resource.code,
      title: this.resource.title,
      material: this.resource.material,
      color: this.resource.color,
      technology: this.resource.technology,
      quantity: this.resource.quantity,
      shipCountry: this.resource.shipCountry,
      bidsCloseAt: this.resource.bidsCloseAt.toISO()!,
      maxLeadDays: this.resource.maxLeadDays,
      requiredTrustTier: this.resource.requiredTrustTier,
      status: this.resource.status,
      orderId: this.resource.orderId,
      fileName: this.resource.modelFile?.originalName ?? null,
      createdAt: this.resource.createdAt.toISO()!,
    }
  }

  forMaker() {
    const f = this.resource.modelFile
    return {
      id: this.resource.id,
      code: this.resource.code,
      title: this.resource.title,
      material: this.resource.material,
      color: this.resource.color,
      technology: this.resource.technology,
      quantity: this.resource.quantity,
      shipCountry: this.resource.shipCountry,
      bidsCloseAt: this.resource.bidsCloseAt.toISO()!,
      maxLeadDays: this.resource.maxLeadDays,
      status: this.resource.status,
      volumeMm3: f?.volumeMm3 ?? null,
      bboxMm:
        f && f.bboxXMm !== null && f.bboxYMm !== null && f.bboxZMm !== null
          ? ([f.bboxXMm, f.bboxYMm, f.bboxZMm] as [number, number, number])
          : null,
    }
  }
}
