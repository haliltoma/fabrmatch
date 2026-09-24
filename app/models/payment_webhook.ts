import { PaymentWebhookSchema } from '#database/schema'

export default class PaymentWebhook extends PaymentWebhookSchema {
  declare payload: Record<string, unknown>
}
