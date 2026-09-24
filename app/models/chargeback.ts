import { ChargebackSchema } from '#database/schema'

export default class Chargeback extends ChargebackSchema {
  declare status: 'open' | 'won' | 'lost'
}
