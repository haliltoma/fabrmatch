import { FraudFlagSchema } from '#database/schema'

export default class FraudFlag extends FraudFlagSchema {
  declare severity: 'review' | 'hold'
  declare status: 'open' | 'cleared' | 'rejected'
}
