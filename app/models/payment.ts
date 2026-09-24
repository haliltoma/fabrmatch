import { PaymentSchema } from '#database/schema'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded'

export default class Payment extends PaymentSchema {
  declare status: PaymentStatus
}
