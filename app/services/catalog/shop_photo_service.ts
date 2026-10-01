import db from '@adonisjs/lucid/services/db'
import { cleanStoredPhoto } from '#services/files/photo_cleaner'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'
import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import JobQcPhoto from '#models/job_qc_photo'
import ProductImage from '#models/product_image'
import ProductionJob from '#models/production_job'

export class ShopPhotoError extends DomainError {}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * Real photos in the shop (R4-T6): a maker offers one of a job's QC photos for the product it
 * printed; it shows only after an admin approved it, because a photo can give away who printed
 * it (business rule 1). Only catalog models that are in the shop qualify — a buyer's own model
 * never becomes public.
 */
export default class ShopPhotoService {
  /** Model files of this job's order that are sold in the shop (active catalog products). */
  async shopModelFileIds(orderId: string): Promise<string[]> {
    const rows = await db
      .from('order_items as oi')
      .join('catalog_products as cp', 'cp.model_file_id', 'oi.model_file_id')
      .where('oi.order_id', orderId)
      .where('cp.is_active', true)
      .distinct('oi.model_file_id')
    return rows.map((r) => r.model_file_id as string)
  }

  async offer(qcPhotoId: string, manufacturerProfileId: string, userId: string) {
    const photo = await JobQcPhoto.find(qcPhotoId)
    const job = photo ? await ProductionJob.find(photo.productionJobId) : null
    if (!photo || !job || job.manufacturerProfileId !== manufacturerProfileId) {
      throw new ShopPhotoError('Photo not found', { status: 404 })
    }
    if (job.status === 'cancelled') throw new ShopPhotoError('This job was cancelled')
    if (await ProductImage.findBy('qcPhotoId', photo.id)) {
      throw new ShopPhotoError('This photo was already offered')
    }
    const [modelFileId] = await this.shopModelFileIds(job.orderId)
    if (!modelFileId) throw new ShopPhotoError('This part is not sold in the shop')

    const ext = photo.storageKey.split('.').pop()?.toLowerCase() ?? ''
    const contentType = CONTENT_TYPES[ext]
    if (!contentType) throw new ShopPhotoError('Unsupported photo type')

    // a copy, so the shop picture outlives the QC photo and the order's retention
    const storageKey = `product-images/photos/${modelFileId}/${photo.id}.${ext}`
    await drive.use('s3').copy(photo.storageKey, storageKey)
    // photos taken before metadata stripping existed are cleaned on the way to the public shop
    await cleanStoredPhoto(storageKey)
    return ProductImage.create({
      modelFileId,
      kind: 'maker_photo',
      status: 'pending',
      storageKey,
      contentType,
      qcPhotoId: photo.id,
      submittedBy: userId,
    })
  }

  /** Offered state per QC photo, for the maker's job cards. */
  async statusByQcPhoto(qcPhotoIds: string[]): Promise<Record<string, string>> {
    if (qcPhotoIds.length === 0) return {}
    const rows = await ProductImage.query().whereIn('qcPhotoId', qcPhotoIds)
    return Object.fromEntries(rows.map((r) => [r.qcPhotoId!, r.status]))
  }

  async pending() {
    const rows = await ProductImage.query()
      .where('kind', 'maker_photo')
      .where('status', 'pending')
      .preload('modelFile')
      .orderBy('id', 'asc')
    const titles = await db
      .from('catalog_products')
      .whereIn(
        'model_file_id',
        rows.map((r) => r.modelFileId)
      )
      .select('model_file_id', 'title')
    const titleOf = new Map(titles.map((r) => [r.model_file_id as string, r.title as string]))
    return rows.map((r) => ({
      id: r.id,
      url: `/admin/images/${r.id}`,
      product: titleOf.get(r.modelFileId) ?? r.modelFile.originalName,
      createdAt: r.createdAt.toISO(),
    }))
  }

  async review(imageId: string, decision: 'approve' | 'reject', adminId: string) {
    await db.transaction(async (trx) => {
      const image = await ProductImage.query({ client: trx })
        .where('id', imageId)
        .where('kind', 'maker_photo')
        .forUpdate()
        .first()
      if (!image) throw new ShopPhotoError('Photo not found', { status: 404 })
      if (image.status !== 'pending') throw new ShopPhotoError('This photo was already reviewed')
      image.status = decision === 'approve' ? 'approved' : 'rejected'
      image.reviewedBy = adminId
      image.reviewedAt = DateTime.now()
      await image.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: `shop_photo.${image.status}`,
          subjectType: 'product_image',
          subjectId: image.id,
          meta: { modelFileId: image.modelFileId },
        },
        { client: trx }
      )
    })
  }
}
