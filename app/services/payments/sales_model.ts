import env from '#start/env'

/**
 * Who sells to the buyer (R7, docs/legal/satis-ve-fatura-modeli.md).
 * - merchant_of_record: Fabrmatch sells and invoices the buyer; makers and sellers are its
 *   suppliers, paid by bank transfer against their invoice (or our expense voucher).
 * - marketplace: the maker sells; money moves through iyzico sub-merchants (R7-T9).
 */
export type SalesModel = 'merchant_of_record' | 'marketplace'

export function salesModel(): SalesModel {
  return env.get('SALES_MODEL', 'merchant_of_record')
}

/** Fabrmatch's own details, shown to payees who invoice it and printed on expense vouchers. */
export function companyDetails() {
  return {
    legalName: env.get('COMPANY_LEGAL_NAME') ?? null,
    taxNumber: env.get('COMPANY_TAX_NUMBER') ?? null,
    taxOffice: env.get('COMPANY_TAX_OFFICE') ?? null,
    address: env.get('COMPANY_ADDRESS') ?? null,
  }
}
