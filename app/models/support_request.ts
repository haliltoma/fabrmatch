import { SupportRequestSchema } from '#database/schema'

export default class SupportRequest extends SupportRequestSchema {
  declare status: 'open' | 'answered'
}
