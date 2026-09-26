import { randomUUID } from 'node:crypto'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import PayeeTaxProfile from '#models/payee_tax_profile'
import type User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import { isValidIban, normalizeIban } from '#services/identity/iban'
import { isValidTckn, isValidVkn } from '#services/identity/tax_ids'
import OrderNotifier from '#services/notifications/order_notifier'
import { PAYEE_TAX_STATUSES, type PayeeTaxStatus } from '#services/payments/payee/tax_treatment'

export class PayeeProfileError extends DomainError {}

export type PayeeType = 'manufacturer' | 'seller'
export interface Payee {
  type: PayeeType
  /** Same id the payouts use: manufacturer_profiles.id, or the seller's users.id */
  id: number
}

export interface PayeeProfileInput {
  taxStatus: PayeeTaxStatus
  legalName: string
  taxNumber: string
  taxOffice: string
  address: string
  iban: string
}

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

/** Tax certificate / exemption certificate: PDF or a photo, recognised by its first bytes. */
export function documentType(bytes: Buffer): { contentType: string; ext: string } | null {
  if (bytes.toString('ascii', 0, 5) === '%PDF-')
    return { contentType: 'application/pdf', ext: 'pdf' }
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: 'image/png', ext: 'png' }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' }
  }
  return null
}

/** Stores an uploaded document under `prefix`; returns its key and type. */
export async function storeDocument(prefix: string, bytes: Buffer) {
  if (bytes.length === 0) throw new PayeeProfileError('Choose a file')
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new PayeeProfileError('The file can be at most 5 MB')
  const type = documentType(bytes)
  if (!type) throw new PayeeProfileError('Upload a PDF, PNG or JPEG file')
  const key = `${prefix}/${randomUUID()}.${type.ext}`
  await drive.use('s3').put(key, bytes, { contentType: type.contentType })
  return { key, contentType: type.contentType }
}

/**
 * Who a maker or seller is for tax purposes and where their money goes (R7-T3). Every change
 * goes back to an admin: payouts only move to an approved profile, so a hijacked account cannot
 * quietly redirect money, and Fabrmatch only buys from payees it can document.
 */
export default class PayeeProfileService {
  private encryption = new EncryptionService()
  private notifier = new OrderNotifier()

  /** The payee behind a logged-in maker or seller. */
  async payeeOf(user: User, type: PayeeType): Promise<Payee> {
    if (type === 'seller') return { type, id: user.id }
    const profile = await ManufacturerProfile.query().where('userId', user.id).firstOrFail()
    return { type, id: profile.id }
  }

  async find(payee: Payee, trx?: TransactionClientContract) {
    return PayeeTaxProfile.query({ client: trx })
      .where('beneficiaryType', payee.type)
      .where('beneficiaryId', payee.id)
      .first()
  }

  /** Approved profile or null — the only thing a payout may be made against. */
  async approved(payee: Payee, trx?: TransactionClientContract) {
    const profile = await this.find(payee, trx)
    return profile?.status === 'approved' ? profile : null
  }

  /**
   * Creates or replaces the payee's details; always back to `pending_review`. A document is
   * required the first time and whenever the tax status changes.
   */
  async submit(user: User, payee: Payee, input: PayeeProfileInput, document: Buffer | null) {
    const clean = validate(input)
    const existing = await this.find(payee)
    const needsDocument = !existing?.documentKey || existing.taxStatus !== clean.taxStatus
    if (needsDocument && !document) {
      throw new PayeeProfileError(
        clean.taxStatus === 'home_exempt'
          ? 'Upload your home-production exemption certificate (esnaf muafiyet belgesi)'
          : 'Upload your tax certificate (vergi levhası)'
      )
    }
    const stored = document
      ? await storeDocument(`payee-documents/${payee.type}-${payee.id}`, document)
      : null

    const now = DateTime.now()
    const profile = await db.transaction(async (trx) => {
      const row =
        (await PayeeTaxProfile.query({ client: trx })
          .where('beneficiaryType', payee.type)
          .where('beneficiaryId', payee.id)
          .forUpdate()
          .first()) ?? new PayeeTaxProfile()
      const oldDocument = row.$isPersisted ? row.documentKey : null
      row.merge({
        beneficiaryType: payee.type,
        beneficiaryId: payee.id,
        userId: user.id,
        taxStatus: clean.taxStatus,
        legalName: clean.legalName,
        taxNumberEnc: this.encryption.encrypt(clean.taxNumber),
        taxOffice: clean.taxOffice,
        addressEnc: this.encryption.encrypt(clean.address),
        ibanEnc: this.encryption.encrypt(clean.iban),
        status: 'pending_review',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        submittedAt: now,
      })
      if (stored) {
        row.documentKey = stored.key
        row.documentContentType = stored.contentType
      }
      await row.useTransaction(trx).save()

      // the maker setup checklist and privacy export read the IBAN from the maker profile
      if (payee.type === 'manufacturer') {
        await ManufacturerProfile.query({ client: trx })
          .where('id', payee.id)
          .update({ iban_enc: row.ibanEnc })
      }
      await AuditLog.create(
        {
          actorId: user.id,
          action: 'payee.profile_submitted',
          subjectType: 'payee_tax_profile',
          subjectId: row.id,
          meta: { taxStatus: clean.taxStatus, newDocument: !!stored },
        },
        { client: trx }
      )
      return { row, oldDocument }
    })
    if (stored && profile.oldDocument) {
      await drive
        .use('s3')
        .delete(profile.oldDocument)
        .catch(() => {})
    }
    return profile.row
  }

  async review(adminId: number, profileId: number, approve: boolean, reason?: string | null) {
    const trimmed = reason?.trim() ?? ''
    if (!approve && trimmed.length < 5) {
      throw new PayeeProfileError('Say what needs to be fixed (at least 5 characters)')
    }
    const profile = await db.transaction(async (trx) => {
      const row = await PayeeTaxProfile.query({ client: trx })
        .where('id', profileId)
        .forUpdate()
        .firstOrFail()
      if (row.status !== 'pending_review') {
        throw new PayeeProfileError('This profile was already reviewed')
      }
      if (row.userId === adminId) {
        throw new PayeeProfileError('You cannot review your own payout details')
      }
      row.status = approve ? 'approved' : 'rejected'
      row.rejectionReason = approve ? null : trimmed
      row.reviewedBy = adminId
      row.reviewedAt = DateTime.now()
      await row.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: approve ? 'payee.profile_approved' : 'payee.profile_rejected',
          subjectType: 'payee_tax_profile',
          subjectId: row.id,
          meta: approve ? {} : { reason: trimmed },
        },
        { client: trx }
      )
      return row
    })
    await this.notifier.payoutAction(
      profile.beneficiaryType,
      profile.beneficiaryId,
      { step: approve ? 'profile_approved' : 'profile_rejected', reason: profile.rejectionReason },
      `profile:${profile.id}:${profile.reviewedAt!.toMillis()}`
    )
    return profile
  }

  async pendingReview() {
    return PayeeTaxProfile.query().where('status', 'pending_review').orderBy('submittedAt', 'asc')
  }

  async document(profileId: number) {
    const profile = await PayeeTaxProfile.findOrFail(profileId)
    if (!profile.documentKey || !profile.documentContentType) return null
    return {
      bytes: Buffer.from(await drive.use('s3').getBytes(profile.documentKey)),
      contentType: profile.documentContentType,
    }
  }
}

/** Trims, normalises and checks every field; the tax number must match the tax status. */
export function validate(input: PayeeProfileInput): PayeeProfileInput {
  if (!PAYEE_TAX_STATUSES.includes(input.taxStatus)) {
    throw new PayeeProfileError('Choose how you are registered for tax')
  }
  const legalName = input.legalName.replaceAll(/\s+/g, ' ').trim()
  const taxNumber = input.taxNumber.replaceAll(/\s+/g, '')
  const taxOffice = input.taxOffice.replaceAll(/\s+/g, ' ').trim()
  const address = input.address.trim()
  const iban = normalizeIban(input.iban)

  if (legalName.length < 3)
    throw new PayeeProfileError('Enter your full legal name or company title')
  if (input.taxStatus === 'company') {
    if (!isValidVkn(taxNumber)) {
      throw new PayeeProfileError('Enter the company tax number (VKN, 10 digits)')
    }
  } else if (!isValidTckn(taxNumber) && !isValidVkn(taxNumber)) {
    throw new PayeeProfileError(
      'Enter your T.C. identity number (11 digits) or tax number (10 digits)'
    )
  }
  if (taxOffice.length < 2) throw new PayeeProfileError('Enter your tax office')
  if (address.length < 10) throw new PayeeProfileError('Enter your full address')
  // payouts are bank transfers in TRY from a Turkish account
  if (!iban.startsWith('TR') || !isValidIban(iban)) {
    throw new PayeeProfileError('Enter a valid Turkish IBAN (TR…)')
  }
  return { taxStatus: input.taxStatus, legalName, taxNumber, taxOffice, address, iban }
}
