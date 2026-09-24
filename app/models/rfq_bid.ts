import { RfqBidSchema } from '#database/schema'

export default class RfqBid extends RfqBidSchema {
  declare status: 'active' | 'withdrawn' | 'won' | 'lost'
}
