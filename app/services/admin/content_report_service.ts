import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import CatalogProduct from '#models/catalog_product'
import ContentReport from '#models/content_report'
import ModelFile from '#models/model_file'
import SellerProduct from '#models/seller_product'

export class ContentReportError extends DomainError {}

export const REPORT_REASONS = ['weapon', 'copyright', 'unsafe', 'other'] as const
type Reason = (typeof REPORT_REASONS)[number]

/** "Report this" from the shop plus the admin decision: block the model, or dismiss. */
export default class ContentReportService {
  async report(
    reporterId: number,
    input: { sellerProductId: number; reason: Reason; details?: string | null }
  ) {
    const product = await SellerProduct.query()
      .where('id', input.sellerProductId)
      .where('status', 'active')
      .first()
    if (!product) throw new ContentReportError('This listing is not available')

    const already = await ContentReport.query()
      .where('reporterId', reporterId)
      .where('sellerProductId', product.id)
      .where('status', 'open')
      .first()
    if (already)
      throw new ContentReportError('You already reported this listing; we are looking at it')

    return ContentReport.create({
      reporterId,
      sellerProductId: product.id,
      reason: input.reason,
      details: input.details?.trim().slice(0, 500) || null,
      status: 'open',
    })
  }

  async listOpen() {
    const rows = await ContentReport.query().where('status', 'open').orderBy('id', 'asc')
    const products = await SellerProduct.query().whereIn(
      'id',
      rows.map((r) => r.sellerProductId).filter((id): id is number => id !== null)
    )
    const byId = new Map(products.map((p) => [p.id, p]))
    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      productId: r.sellerProductId,
      productTitle: r.sellerProductId ? (byId.get(r.sellerProductId)?.title ?? null) : null,
      createdAt: r.createdAt.toISO(),
    }))
  }

  /** Blocks the model behind the listing for good (orders and downloads stop) and closes every open report on it. */
  async block(reportId: number, adminId: number, reason: string) {
    await db.transaction(async (trx) => {
      const report = await ContentReport.query({ client: trx })
        .where('id', reportId)
        .forUpdate()
        .first()
      if (!report || report.status !== 'open') throw new ContentReportError('Report not found')
      const product = await SellerProduct.query({ client: trx })
        .where('id', report.sellerProductId!)
        .preload('catalogProduct')
        .first()
      const fileId = product?.catalogProduct?.modelFileId
      if (!product || !fileId) throw new ContentReportError('Nothing to block')

      await ModelFile.query({ client: trx })
        .where('id', fileId)
        .update({
          blocked_at: DateTime.now().toSQL(),
          blocked_reason: reason.trim() || report.reason,
        })
      await CatalogProduct.query({ client: trx })
        .where('modelFileId', fileId)
        .update({ is_active: false })

      const siblings = await SellerProduct.query({ client: trx })
        .join('catalog_products', 'catalog_products.id', 'seller_products.catalog_product_id')
        .where('catalog_products.model_file_id', fileId)
        .select('seller_products.id')
      await ContentReport.query({ client: trx })
        .where('status', 'open')
        .whereIn(
          'sellerProductId',
          siblings.map((s) => s.id)
        )
        .update({ status: 'actioned', resolved_by: adminId, resolved_at: DateTime.now().toSQL() })
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'content.blocked',
          subjectType: 'model_file',
          subjectId: fileId,
          meta: { reportId, reason },
        },
        { client: trx }
      )
    })
  }

  async dismiss(reportId: number, adminId: number) {
    const changed = await ContentReport.query()
      .where('id', reportId)
      .where('status', 'open')
      .update({ status: 'dismissed', resolved_by: adminId, resolved_at: DateTime.now().toSQL() })
      .returning('id')
    if (changed.length === 0) throw new ContentReportError('Report not found')
    await AuditLog.create({
      actorId: adminId,
      action: 'content.report_dismissed',
      subjectType: 'content_report',
      subjectId: reportId,
      meta: {},
    })
  }
}
