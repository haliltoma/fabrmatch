import { CouponSchema } from '#database/schema'

export default class Coupon extends CouponSchema {
  declare kind: 'percent' | 'fixed'
}
