import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'
import Payout from '#models/payout'
import PayeeTaxProfile from '#models/payee_tax_profile'
import EncryptionService from '#services/identity/encryption_service'
import PayoutService from '#services/payments/payout_service'
import PayeeProfileService from '#services/payments/payee/payee_profile_service'
import PayoutDocumentService from '#services/payments/payee/payout_document_service'
import { salesModel } from '#services/payments/sales_model'
import PayeeTaxProfileTransformer from '#transformers/payee_tax_profile_transformer'
import PayoutTransformer from '#transformers/payout_transformer'

const decisionValidator = vine.create({
  decision: vine.enum(['approve', 'reject'] as const),
  reason: vine.string().trim().maxLength(500).optional(),
})

const paidValidator = vine.create({
  reference: vine.string().trim().minLength(3).maxLength(128),
})

/** Payee details and invoices to review, and bank transfers to send (R7-T3/T4, sales model B). */
export default class AdminPayoutController {
  private payees = new PayeeProfileService()
  private documents = new PayoutDocumentService()

  async index({ inertia }: HttpContext) {
    const resolver = app.container.createResolver()
    const ready = await Payout.query()
      .where('status', 'pending')
      .whereNotNull('taxStatus')
      .preload('order')
      .preload('document')
      .orderBy('id', 'asc')
      .limit(200)
    return inertia.render('admin/payouts/index', {
      salesModel: salesModel(),
      profiles: await PayeeTaxProfileTransformer.transform(await this.payees.pendingReview())
        .useVariant('forAdmin')
        .resolve(resolver, 0),
      invoices: await this.withPayee(
        await PayoutTransformer.transform(await this.documents.pendingReview())
          .useVariant('forAdmin')
          .resolve(resolver, 0)
      ),
      ready: await this.withPayee(
        await PayoutTransformer.transform(ready).useVariant('forAdmin').resolve(resolver, 0)
      ),
    })
  }

  /** Adds the payee's legal name and IBAN (admin only) to payout rows. */
  private async withPayee<T extends { beneficiaryType: string; beneficiaryId: string }>(rows: T[]) {
    if (rows.length === 0) return []
    const encryption = new EncryptionService()
    const profiles = await PayeeTaxProfile.query().where((q) => {
      for (const row of rows) {
        q.orWhere((w) =>
          w.where('beneficiaryType', row.beneficiaryType).where('beneficiaryId', row.beneficiaryId)
        )
      }
    })
    const key = (type: string, id: string) => `${type}:${id}`
    const byPayee = new Map(profiles.map((p) => [key(p.beneficiaryType, p.beneficiaryId), p]))
    return rows.map((row) => {
      const profile = byPayee.get(key(row.beneficiaryType, row.beneficiaryId))
      return {
        ...row,
        payee: profile
          ? {
              legalName: profile.legalName,
              iban: encryption.decrypt(profile.ibanEnc),
              approved: profile.status === 'approved',
            }
          : null,
      }
    })
  }

  async reviewProfile({ request, params, auth, response, session }: HttpContext) {
    const { decision, reason } = await request.validateUsing(decisionValidator)
    await this.payees.review(auth.getUserOrFail().id, params.id, decision === 'approve', reason)
    session.flash(
      'success',
      decision === 'approve' ? 'Details approved.' : 'Sent back to the payee.'
    )
    return response.redirect().toPath('/admin/payouts')
  }

  async reviewInvoice({ request, params, auth, response, session }: HttpContext) {
    const { decision, reason } = await request.validateUsing(decisionValidator)
    await this.documents.reviewInvoice(
      auth.getUserOrFail().id,
      params.id,
      decision === 'approve',
      reason
    )
    session.flash(
      'success',
      decision === 'approve' ? 'Invoice approved; the payout is ready.' : 'Invoice sent back.'
    )
    return response.redirect().toPath('/admin/payouts')
  }

  async markPaid({ request, params, auth, response, session }: HttpContext) {
    const { reference } = await request.validateUsing(paidValidator)
    await new PayoutService().markPaid(auth.getUserOrFail().id, params.id, reference)
    session.flash('success', 'Payout marked as paid.')
    return response.redirect().toPath('/admin/payouts')
  }

  /** The payee's tax or exemption certificate. */
  async profileDocument({ params, response }: HttpContext) {
    const file = await this.payees.document(params.id)
    if (!file) return response.notFound()
    return this.sendFile(response, file)
  }

  /** The invoice a payee uploaded. `params.id` is the document id. */
  async invoiceFile({ params, response }: HttpContext) {
    const file = await this.documents.file(params.id)
    if (!file) return response.notFound()
    return this.sendFile(response, file)
  }

  async voucher({ params, response }: HttpContext) {
    const html = await this.documents.voucherHtml(params.id, null)
    if (!html) return response.notFound()
    return response.header('content-type', 'text/html; charset=utf-8').send(html)
  }

  /** Transfers to send: one line per payout, for the bank's bulk upload or by hand. */
  async readyCsv({ response }: HttpContext) {
    const rows = await Payout.query()
      .where('status', 'pending')
      .whereNotNull('taxStatus')
      .preload('order')
      .orderBy('id', 'asc')
    const withPayee = await this.withPayee(
      rows.map((p) => ({
        id: p.id,
        beneficiaryType: p.beneficiaryType,
        beneficiaryId: p.beneficiaryId,
        orderCode: p.order.code,
        amountMinor: p.amountMinor,
        currency: p.currency,
      }))
    )
    const cell = (value: string) => `"${value.replaceAll('"', '""')}"`
    const lines = [
      ['payout_id', 'order', 'payee', 'iban', 'amount', 'currency', 'description'].join(','),
      ...withPayee
        .filter((r) => r.payee?.approved)
        .map((r) =>
          [
            r.id,
            cell(r.orderCode),
            cell(r.payee!.legalName),
            r.payee!.iban,
            (r.amountMinor / 100).toFixed(2),
            r.currency,
            cell(`Fabrmatch ${r.orderCode} payout ${r.id}`),
          ].join(',')
        ),
    ]
    return response
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="payouts-ready.csv"')
      .header('cache-control', 'private, no-store')
      .send(lines.join('\n'))
  }

  private sendFile(
    response: HttpContext['response'],
    file: { bytes: Buffer; contentType: string }
  ) {
    response.header('Content-Type', file.contentType)
    response.header('Cache-Control', 'private, no-store')
    response.header('X-Content-Type-Options', 'nosniff')
    response.header('Content-Disposition', 'inline')
    // uploaded by a payee: never let it run script in our origin
    response.header('Content-Security-Policy', "sandbox; default-src 'none'")
    return response.send(file.bytes)
  }
}
