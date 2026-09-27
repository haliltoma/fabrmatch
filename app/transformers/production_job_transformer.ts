import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProductionJob from '#models/production_job'
import OrderTransformer from '#transformers/order_transformer'
import DisputeTransformer from '#transformers/dispute_transformer'

/** Manufacturer-facing view of a job. File names are anonymised (PRD §10). */
export default class ProductionJobTransformer extends BaseTransformer<ProductionJob> {
  toObject() {
    const job = this.resource
    const closed = job.status === 'cancelled'
    // only disputes opened while this maker had the job: after a reprint, the next maker does not
    // see the first one's complaint and reply, nor the first one the next's
    const mine = (job.order?.disputes ?? []).filter((d) => d.createdAt >= job.acceptedAt)
    const dispute = mine.length > 0 ? mine[mine.length - 1] : null
    return {
      id: this.resource.id,
      status: this.resource.status,
      acceptedAt: this.resource.acceptedAt.toISO()!,
      dueAt: this.resource.dueAt.toISO()!,
      shippedAt: this.resource.shippedAt?.toISO() ?? null,
      carrier: this.resource.carrier,
      trackingNumber: this.resource.trackingNumber,
      rating: this.resource.rating,
      qcPhotoCount: (this.resource.qcPhotos ?? []).length,
      dispute: dispute ? DisputeTransformer.transform(dispute).useVariant('forManufacturer') : null,
      order: OrderTransformer.transform(this.resource.order).useVariant(
        closed ? 'forManufacturerClosed' : 'forManufacturer'
      ),
      files: (this.resource.grants ?? []).map((g, index) => ({
        grantId: g.id,
        label: `model-${this.resource.orderId}-${index + 1}`,
        expiresAt: g.expiresAt.toISO()!,
        downloadsLeft: Math.max(g.maxDownloads - g.downloadCount, 0),
        isValid: g.isValid,
      })),
    }
  }
}
