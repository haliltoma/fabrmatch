import { OrderMessageSchema } from '#database/schema'

export default class OrderMessage extends OrderMessageSchema {
  declare senderRole: 'buyer' | 'maker'
}
