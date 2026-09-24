import { WebhookDeliverySchema } from '#database/schema'

export default class WebhookDelivery extends WebhookDeliverySchema {
  declare status: 'pending' | 'delivered' | 'failed'
}
