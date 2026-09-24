import { ReferralSchema } from '#database/schema'

export default class Referral extends ReferralSchema {
  declare status: 'pending' | 'rewarded' | 'rejected'
}
