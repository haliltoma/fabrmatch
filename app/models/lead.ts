import { LeadSchema } from '#database/schema'

export default class Lead extends LeadSchema {
  declare interest: 'maker' | 'seller' | 'buyer'
}
