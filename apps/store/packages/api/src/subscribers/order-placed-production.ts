import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { errorMessage } from "../lib/error-message"
import { createProductionRequestsWorkflow } from "../workflows/create-production-requests"
import { dispatchProductionRequestWorkflow } from "../workflows/dispatch-production-request"

/**
 * Mercur her satıcı siparişi için ayrı `order.placed` yayar. Siparişe-göre-üretilen
 * kalemler için üretim talebi açılır ve Sistem B'ye gönderilir. Gönderim başarısız
 * olursa kayıt `dispatch_failed` kalır, `retry-production-dispatch` job'ı yeniden dener.
 */
export default async function orderPlacedProductionHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result: requests } = await createProductionRequestsWorkflow(container).run({
      input: { order_id: data.id },
    })

    for (const request of requests) {
      const { result } = await dispatchProductionRequestWorkflow(container).run({
        input: { id: request.id },
      })
      if (!result.dispatched) {
        logger.warn(`Production request ${request.id} could not be dispatched; it will be retried`)
      }
    }
  } catch (error) {
    logger.error(`Failed to create production requests for order ${data.id}: ${errorMessage(error)}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
