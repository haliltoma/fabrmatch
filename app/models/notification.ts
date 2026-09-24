import { NotificationSchema } from '#database/schema'

export default class Notification extends NotificationSchema {
  declare data: Record<string, unknown>
}
