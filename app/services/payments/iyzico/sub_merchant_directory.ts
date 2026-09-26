import db from '@adonisjs/lucid/services/db'
import DomainError from '#exceptions/domain_error'
import type {
  IyzicoSubMerchantInput,
  SubMerchantDirectory,
} from '#services/payments/iyzico/iyzico_provider'

/**
 * Sub-merchant keys in `payment_sub_merchants`. Onboarding details (identity number, IBAN, tax
 * office, phone, address) are not collected yet: that form ships when iyzico enables the
 * marketplace product on the account, until then `details` refuses.
 */
export default class DbSubMerchantDirectory implements SubMerchantDirectory {
  async find(type: 'manufacturer' | 'seller', id: number) {
    const row = await db
      .from('payment_sub_merchants')
      .where({ provider: 'iyzico', beneficiary_type: type, beneficiary_id: id })
      .select('sub_merchant_key')
      .first()
    return (row?.sub_merchant_key as string | undefined) ?? null
  }

  async save(type: 'manufacturer' | 'seller', id: number, key: string) {
    await db
      .table('payment_sub_merchants')
      .insert({
        provider: 'iyzico',
        beneficiary_type: type,
        beneficiary_id: id,
        sub_merchant_key: key,
        created_at: new Date(),
      })
      .onConflict(['provider', 'beneficiary_type', 'beneficiary_id'])
      .merge(['sub_merchant_key'])
  }

  async details(type: 'manufacturer' | 'seller', id: number): Promise<IyzicoSubMerchantInput> {
    throw new DomainError(
      `Sub-merchant onboarding details for ${type} ${id} are not collected yet`,
      { status: 422 }
    )
  }
}
