import { splitGross } from '#services/tax/tax'

export type PayeeTaxStatus = 'company' | 'sole_proprietor' | 'simple_method' | 'home_exempt'
export const PAYEE_TAX_STATUSES: PayeeTaxStatus[] = [
  'company',
  'sole_proprietor',
  'simple_method',
  'home_exempt',
]

export interface TaxTreatment {
  /** Charges VAT on its invoice, so Fabrmatch reclaims it */
  vatRegistered: boolean
  /** Who issues the purchase document: the payee's invoice, or our expense voucher */
  document: 'supplier_invoice' | 'expense_voucher'
  withholdingBps: number
}

/**
 * How Fabrmatch buys from each kind of payee (sales model B):
 * - company / sole proprietor (real method): VAT invoice, Fabrmatch reclaims the VAT
 * - simple method (basit usul): invoice without VAT
 * - home producer with the GVK 9/6 exemption: no invoice; Fabrmatch issues an expense voucher
 *   and withholds income tax (GVK 94/13)
 */
export function treatmentFor(
  status: PayeeTaxStatus,
  homeExemptWithholdingBps: number
): TaxTreatment {
  switch (status) {
    case 'company':
    case 'sole_proprietor':
      return { vatRegistered: true, document: 'supplier_invoice', withholdingBps: 0 }
    case 'simple_method':
      return { vatRegistered: false, document: 'supplier_invoice', withholdingBps: 0 }
    case 'home_exempt':
      return {
        vatRegistered: false,
        document: 'expense_voucher',
        withholdingBps: homeExemptWithholdingBps,
      }
  }
}

export interface PayeeSplit {
  /** What the payee's document shows: VAT included for registered payees, without it otherwise */
  grossMinor: number
  /** Input VAT Fabrmatch reclaims (0 for payees outside VAT) */
  vatMinor: number
  withholdingMinor: number
  /** Cash to transfer */
  payableMinor: number
}

/**
 * Splits a payee's share of the order (a VAT-inclusive slice of what the buyer paid).
 * Fabrmatch owes the output VAT on the whole sale, so a payee outside VAT is paid the share
 * without its VAT part — the VAT the buyer paid on it goes to the tax office, not to the payee.
 * Integer maths only; withholding rounds half up.
 */
export function splitPayeeShare(
  shareMinor: number,
  vatRateBps: number,
  treatment: TaxTreatment
): PayeeSplit {
  const vatPart = splitGross(shareMinor, vatRateBps).taxMinor
  if (treatment.vatRegistered) {
    return {
      grossMinor: shareMinor,
      vatMinor: vatPart,
      withholdingMinor: 0,
      payableMinor: shareMinor,
    }
  }
  const base = shareMinor - vatPart
  const withholding = Math.floor((base * treatment.withholdingBps + 5000) / 10_000)
  return {
    grossMinor: base,
    vatMinor: 0,
    withholdingMinor: withholding,
    payableMinor: base - withholding,
  }
}

/**
 * Fabrmatch's side of one sale (sales model B): the output VAT it owes on everything the buyer
 * paid, the input VAT it reclaims from payees' invoices, what it withheld, and its own result.
 * Always balances: escrow + inputVat = outputVat + payouts + withheld + ours.
 */
export function saleBreakdown(escrowMinor: number, vatRateBps: number, splits: PayeeSplit[]) {
  const outputVat = splitGross(escrowMinor, vatRateBps).taxMinor
  const inputVat = splits.reduce((sum, s) => sum + s.vatMinor, 0)
  const withheld = splits.reduce((sum, s) => sum + s.withholdingMinor, 0)
  const paid = splits.reduce((sum, s) => sum + s.payableMinor, 0)
  return {
    outputVat,
    inputVat,
    withheld,
    ours: escrowMinor + inputVat - outputVat - paid - withheld,
  }
}
