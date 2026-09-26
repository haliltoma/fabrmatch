import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import Order from '#models/order'
import Payout from '#models/payout'
import PayoutDocument from '#models/payout_document'
import OrderNotifier from '#services/notifications/order_notifier'
import PayeeTaxProfile from '#models/payee_tax_profile'
import EncryptionService from '#services/identity/encryption_service'
import { companyDetails } from '#services/payments/sales_model'
import { storeDocument, type Payee } from '#services/payments/payee/payee_profile_service'

export class PayoutDocumentError extends DomainError {}

export interface InvoiceInput {
  number: string
  issuedOn: DateTime
  grossMinor: number
  vatMinor: number
}

/** Rounding differences between invoicing programs: at most one kuruş of VAT. */
const VAT_TOLERANCE_MINOR = 1

/**
 * The purchase document behind every payout under sales model B (R7-T4):
 * - a VAT-registered or simple-method payee invoices Fabrmatch and uploads it; an admin checks it
 *   against the payout (amount, VAT, our title) before the money can move
 * - a home producer does not invoice: Fabrmatch issues the expense voucher (gider pusulası) itself,
 *   with the income tax it withholds
 */
export default class PayoutDocumentService {
  private notifier = new OrderNotifier()

  /** Payouts of this payee that still need their invoice (or whose invoice was rejected). */
  async awaiting(payee: Payee) {
    return Payout.query()
      .where('beneficiaryType', payee.type)
      .where('beneficiaryId', payee.id)
      .where('status', 'awaiting_document')
      .preload('order')
      .preload('document')
      .orderBy('id', 'asc')
  }

  /** The payee's recent payouts with their documents, newest first (their own records). */
  async history(payee: Payee) {
    return Payout.query()
      .where('beneficiaryType', payee.type)
      .where('beneficiaryId', payee.id)
      .whereNot('status', 'awaiting_document')
      .whereNotNull('taxStatus')
      .preload('order')
      .preload('document')
      .orderBy('id', 'desc')
      .limit(50)
  }

  async submitInvoice(
    userId: number,
    payee: Payee,
    payoutId: number,
    input: InvoiceInput,
    file: Buffer
  ) {
    const number = input.number.replaceAll(/\s+/g, '').toUpperCase()
    if (number.length < 3 || number.length > 64) {
      throw new PayoutDocumentError('Enter the invoice number as it appears on the invoice')
    }
    if (input.issuedOn > DateTime.now().endOf('day')) {
      throw new PayoutDocumentError('The invoice date cannot be in the future')
    }

    const payout = await Payout.query()
      .where('id', payoutId)
      .where('beneficiaryType', payee.type)
      .where('beneficiaryId', payee.id)
      .first()
    if (!payout) throw new PayoutDocumentError('Payout not found', { status: 404 })
    if (payout.status !== 'awaiting_document') {
      throw new PayoutDocumentError('This payout does not need an invoice')
    }
    const expectedGross = payout.grossMinor ?? payout.amountMinor
    if (input.grossMinor !== expectedGross) {
      throw new PayoutDocumentError(
        `The invoice total must be exactly ${format(expectedGross, payout.currency)}`
      )
    }
    if (Math.abs(input.vatMinor - payout.vatMinor) > VAT_TOLERANCE_MINOR) {
      throw new PayoutDocumentError(
        payout.vatMinor === 0
          ? 'This invoice should carry no VAT'
          : `The VAT on the invoice must be ${format(payout.vatMinor, payout.currency)}`
      )
    }

    const stored = await storeDocument(`payout-documents/${payout.id}`, file)
    const document = await db.transaction(async (trx) => {
      const locked = await Payout.query({ client: trx })
        .where('id', payout.id)
        .forUpdate()
        .firstOrFail()
      if (locked.status !== 'awaiting_document') {
        throw new PayoutDocumentError('This payout does not need an invoice')
      }
      const existing = await PayoutDocument.query({ client: trx })
        .where('payoutId', payout.id)
        .forUpdate()
        .first()
      if (existing && existing.status !== 'rejected') {
        throw new PayoutDocumentError('An invoice for this payout is already waiting for review')
      }
      const row = existing ?? new PayoutDocument()
      const oldFile = existing?.fileKey ?? null
      row.merge({
        payoutId: payout.id,
        kind: 'supplier_invoice',
        number,
        issuedOn: input.issuedOn,
        grossMinor: input.grossMinor,
        vatMinor: input.vatMinor,
        withholdingMinor: 0,
        currency: payout.currency,
        fileKey: stored.key,
        fileContentType: stored.contentType,
        status: 'submitted',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      })
      await row.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: userId,
          action: 'payout.invoice_submitted',
          subjectType: 'payout',
          subjectId: payout.id,
          meta: { number, grossMinor: input.grossMinor, vatMinor: input.vatMinor },
        },
        { client: trx }
      )
      return { row, oldFile }
    })
    if (document.oldFile) {
      await drive
        .use('s3')
        .delete(document.oldFile)
        .catch(() => {})
    }
    return document.row
  }

  /** Approve → the payout joins the next bank transfer; reject → the payee uploads a new one. */
  async reviewInvoice(
    adminId: number,
    documentId: number,
    approve: boolean,
    reason?: string | null
  ) {
    const trimmed = reason?.trim() ?? ''
    if (!approve && trimmed.length < 5) {
      throw new PayoutDocumentError('Say what is wrong with the invoice (at least 5 characters)')
    }
    const { document, payout } = await db.transaction(async (trx) => {
      const row = await PayoutDocument.query({ client: trx })
        .where('id', documentId)
        .forUpdate()
        .firstOrFail()
      if (row.status !== 'submitted')
        throw new PayoutDocumentError('This invoice was already reviewed')
      const locked = await Payout.query({ client: trx })
        .where('id', row.payoutId)
        .forUpdate()
        .firstOrFail()
      row.status = approve ? 'approved' : 'rejected'
      row.rejectionReason = approve ? null : trimmed
      row.reviewedBy = adminId
      row.reviewedAt = DateTime.now()
      await row.useTransaction(trx).save()
      if (approve && locked.status === 'awaiting_document') {
        locked.status = 'pending'
        await locked.useTransaction(trx).save()
      }
      await AuditLog.create(
        {
          actorId: adminId,
          action: approve ? 'payout.invoice_approved' : 'payout.invoice_rejected',
          subjectType: 'payout',
          subjectId: locked.id,
          meta: approve ? { documentId: row.id } : { documentId: row.id, reason: trimmed },
        },
        { client: trx }
      )
      return { document: row, payout: locked }
    })
    const order = await Order.find(payout.orderId)
    await this.notifier.payoutAction(
      payout.beneficiaryType,
      payout.beneficiaryId,
      {
        step: approve ? 'invoice_approved' : 'invoice_rejected',
        code: order?.code,
        reason: document.rejectionReason,
      },
      `invoice:${document.id}:${document.reviewedAt!.toMillis()}`
    )
    return document
  }

  /**
   * Fabrmatch's expense voucher for a home producer, numbered without gaps per year
   * (`GP2026000001`). Created with the payout, already approved: we are the issuer.
   */
  async issueVoucher(payout: Payout, trx: TransactionClientContract) {
    const now = DateTime.now()
    await trx.rawQuery('select pg_advisory_xact_lock(hashtext(?))', ['payout-voucher-number'])
    const prefix = `GP${now.year}`
    const last = await trx
      .from('payout_documents')
      .where('kind', 'expense_voucher')
      .whereLike('number', `${prefix}%`)
      .max('number as number')
      .first()
    const next = last?.number ? Number(String(last.number).slice(prefix.length)) + 1 : 1
    return PayoutDocument.create(
      {
        payoutId: payout.id,
        kind: 'expense_voucher',
        number: `${prefix}${String(next).padStart(6, '0')}`,
        issuedOn: now,
        grossMinor: payout.grossMinor ?? payout.amountMinor + payout.withholdingMinor,
        vatMinor: 0,
        withholdingMinor: payout.withholdingMinor,
        currency: payout.currency,
        status: 'approved',
      },
      { client: trx }
    )
  }

  /** Invoices waiting for an admin, as their payouts (with order and document). */
  async pendingReview() {
    return Payout.query()
      .whereHas('document', (q) => q.where('status', 'submitted'))
      .preload('order')
      .preload('document')
      .orderBy('id', 'asc')
  }

  async file(documentId: number) {
    const document = await PayoutDocument.findOrFail(documentId)
    if (!document.fileKey || !document.fileContentType) return null
    return {
      bytes: Buffer.from(await drive.use('s3').getBytes(document.fileKey)),
      contentType: document.fileContentType,
    }
  }

  /**
   * Printable expense voucher (gider pusulası, VUK 234). `payee` limits it to that payee's own
   * vouchers; the admin passes null. Shows the payee's full tax number: it is their document.
   */
  async voucherHtml(payoutId: number, payee: Payee | null): Promise<string | null> {
    const query = Payout.query().where('id', payoutId).preload('order').preload('document')
    if (payee) query.where('beneficiaryType', payee.type).where('beneficiaryId', payee.id)
    const payout = await query.first()
    const voucher = payout?.document
    if (!payout || voucher?.kind !== 'expense_voucher') return null
    const profile = await PayeeTaxProfile.query()
      .where('beneficiaryType', payout.beneficiaryType)
      .where('beneficiaryId', payout.beneficiaryId)
      .firstOrFail()
    const encryption = new EncryptionService()
    const company = companyDetails()
    const money = (minor: number) => escapeHtml(format(minor, voucher.currency))
    const line = (value: string | null) => escapeHtml(value ?? '—')
    return `<!doctype html><html lang="tr"><meta charset="utf-8"><title>Gider pusulası ${escapeHtml(voucher.number)}</title>
<style>body{font:15px/1.5 system-ui;max-width:680px;margin:40px auto;color:#15181C}h1{font-size:22px}td{padding:4px 12px 4px 0;vertical-align:top}.r{text-align:right}.m{font-family:ui-monospace,monospace}.b{border-top:1px solid #ccc}</style>
<h1>GİDER PUSULASI <span class="m">${escapeHtml(voucher.number)}</span></h1>
<p>Düzenleme tarihi ${escapeHtml(voucher.issuedOn.toISODate() ?? '')} · Sipariş <span class="m">${escapeHtml(payout.order.code)}</span></p>
<table>
<tr><td><strong>Düzenleyen</strong></td><td>${line(company.legalName)}<br>VKN <span class="m">${line(company.taxNumber)}</span> · ${line(company.taxOffice)}<br>${line(company.address)}</td></tr>
<tr><td><strong>Satıcı (esnaf muaflığı, GVK 9/6)</strong></td><td>${escapeHtml(profile.legalName)}<br>TCKN/VKN <span class="m">${escapeHtml(encryption.decrypt(profile.taxNumberEnc))}</span> · ${escapeHtml(profile.taxOffice)}<br>${escapeHtml(encryption.decrypt(profile.addressEnc))}</td></tr>
</table>
<table>
<tr><td>3D baskı ürünü (fason üretim)</td><td class="r">${money(voucher.grossMinor)}</td></tr>
<tr><td>Gelir vergisi tevkifatı (GVK 94/13)</td><td class="r">−${money(voucher.withholdingMinor)}</td></tr>
<tr class="b"><td><strong>Ödenecek tutar</strong></td><td class="r"><strong>${money(voucher.grossMinor - voucher.withholdingMinor)}</strong></td></tr>
</table>
<p style="color:#6B737C;font-size:13px">Tevkif edilen vergi Fabrmatch tarafından muhtasar beyanname ile vergi dairesine ödenir.</p></html>`
  }

  /** Tells the payee an invoice is needed (called once the payout exists). */
  async askForInvoice(payout: Payout, orderCode: string) {
    await this.notifier.payoutAction(
      payout.beneficiaryType,
      payout.beneficiaryId,
      {
        step: 'invoice_needed',
        code: orderCode,
        amountMinor: payout.grossMinor ?? payout.amountMinor,
        currency: payout.currency,
      },
      `invoice-needed:${payout.id}`
    )
  }
}

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function format(minor: number, currency: string) {
  return `${(minor / 100).toFixed(2)} ${currency}`
}
