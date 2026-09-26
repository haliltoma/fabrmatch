import { BaseTransformer } from '@adonisjs/core/transformers'
import type PayeeTaxProfile from '#models/payee_tax_profile'
import EncryptionService from '#services/identity/encryption_service'
import { maskIban } from '#services/identity/iban'

const mask = (value: string) =>
  value.length <= 4 ? '••••' : `${'•'.repeat(value.length - 4)}${value.slice(-4)}`

/**
 * Tax and bank details of a payee. The owner sees the tax number and IBAN masked (a hijacked
 * session learns nothing new); only the reviewing admin sees them in full.
 */
export default class PayeeTaxProfileTransformer extends BaseTransformer<PayeeTaxProfile> {
  private encryption = new EncryptionService()

  toObject() {
    const p = this.resource
    return {
      taxStatus: p.taxStatus,
      legalName: p.legalName,
      taxNumberMasked: mask(this.encryption.decrypt(p.taxNumberEnc)),
      taxOffice: p.taxOffice,
      address: this.encryption.decrypt(p.addressEnc),
      ibanMasked: maskIban(this.encryption.decrypt(p.ibanEnc)),
      hasDocument: !!p.documentKey,
      status: p.status,
      rejectionReason: p.rejectionReason,
      submittedAt: p.submittedAt.toISO(),
    }
  }

  forAdmin() {
    const p = this.resource
    return {
      id: p.id,
      beneficiaryType: p.beneficiaryType,
      beneficiaryId: p.beneficiaryId,
      taxStatus: p.taxStatus,
      legalName: p.legalName,
      taxNumber: this.encryption.decrypt(p.taxNumberEnc),
      taxOffice: p.taxOffice,
      address: this.encryption.decrypt(p.addressEnc),
      iban: this.encryption.decrypt(p.ibanEnc),
      hasDocument: !!p.documentKey,
      status: p.status,
      submittedAt: p.submittedAt.toISO(),
    }
  }
}
