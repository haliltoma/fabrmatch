import { InvoiceSchema } from '#database/schema'

export default class Invoice extends InvoiceSchema {
  declare kind: 'platform_fee'
  declare status: 'issued' | 'voided'
}
