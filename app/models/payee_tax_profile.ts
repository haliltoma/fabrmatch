import { PayeeTaxProfileSchema } from '#database/schema'
import type { PayeeTaxStatus } from '#services/payments/payee/tax_treatment'

export type PayeeProfileStatus = 'pending_review' | 'approved' | 'rejected'

/** Tax identity and bank account of a maker or seller (R7-T3). Nothing is paid until approved. */
export default class PayeeTaxProfile extends PayeeTaxProfileSchema {
  declare beneficiaryType: 'manufacturer' | 'seller'
  declare taxStatus: PayeeTaxStatus
  declare status: PayeeProfileStatus
}
