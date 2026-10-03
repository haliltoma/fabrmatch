import { ModerationEventSchema } from '#database/schema'

export type ModerationReason = 'contact' | 'company' | 'off_platform'
export type ModerationContext =
  'order_message' | 'revision_request' | 'revision_response' | 'buyer_note' | 'colour_part'

/** A text that was not sent because it shared contact details or who someone is (Paket Y). */
export default class ModerationEvent extends ModerationEventSchema {
  declare reason: ModerationReason
  declare context: ModerationContext
  declare source: 'rules' | 'ai'
}
