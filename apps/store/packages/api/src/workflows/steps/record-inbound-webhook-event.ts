import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type RecordInboundWebhookEventInput = {
  event_id: string
  production_request_id: string
  status: string
  occurred_at: string
}

/**
 * Gelen-kutusu defteri (09-API-SOZLESMESI, günlük uzlaştırma). Sistem B'nin
 * `event_id`'siyle idempotent — aynı olay ikinci kez işlense bile (ör. Sistem B'nin
 * yavaş ama başarılı ilk denemesinden sonra tekrar göndermesi) tek kayıt kalır.
 */
export const recordInboundWebhookEventStep = createStep(
  "record-inbound-webhook-event",
  async (input: RecordInboundWebhookEventInput, { container }) => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const [existing] = await service.listInboundWebhookEvents({ event_id: input.event_id })
    if (existing) {
      return new StepResponse({ recorded: false }, null)
    }

    const created = await service.createInboundWebhookEvents({
      event_id: input.event_id,
      production_request_external_id: input.production_request_id,
      status: input.status,
      received_at: new Date(input.occurred_at),
    })
    return new StepResponse({ recorded: true }, created.id)
  },
  async (createdId, { container }) => {
    if (!createdId) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.deleteInboundWebhookEvents(createdId)
  }
)
