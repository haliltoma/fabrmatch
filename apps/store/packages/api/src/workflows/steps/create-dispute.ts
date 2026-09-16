import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type CreateDisputeInput = {
  production_request_external_id: string
  order_id: string
  reason: string
  opened_by: string
}

export const createDisputeStep = createStep(
  "create-dispute",
  async (input: CreateDisputeInput, { container }): Promise<StepResponse<{ id: string }, string>> => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const created = await service.createDisputes({
      production_request_external_id: input.production_request_external_id,
      order_id: input.order_id,
      reason: input.reason,
      opened_by: input.opened_by,
      opened_at: new Date(),
    })
    return new StepResponse({ id: created.id }, created.id)
  },
  async (createdId, { container }) => {
    if (!createdId) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.deleteDisputes(createdId)
  }
)
