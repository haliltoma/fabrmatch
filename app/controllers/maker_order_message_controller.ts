import type { Side } from '#services/messaging/message_service'
import OrderMessageController from '#controllers/order_message_controller'

/** Maker door: /maker/orders/:id/messages. */
export default class MakerOrderMessageController extends OrderMessageController {
  protected override expected: Side = 'maker'
}
