import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"
import type { SendProductionRequestOutput } from "./send-production-request"

export const recordDispatchResultStep = createStep(
  "record-dispatch-result",
  async (input: SendProductionRequestOutput, { container }) => {
    if (input.skipped) {
      return new StepResponse({ id: input.id, dispatched: true }, null)
    }

    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const attempts = input.previous.dispatch_attempts + 1

    if (input.result.ok) {
      await service.updateProductionRequests({
        id: input.id,
        external_id: input.result.production_request_id,
        status: "matching_in_progress",
        dispatch_attempts: attempts,
        last_error: null,
      })
    } else {
      await service.updateProductionRequests({
        id: input.id,
        status: "dispatch_failed",
        dispatch_attempts: attempts,
        last_error: input.result.error,
      })
    }

    return new StepResponse(
      { id: input.id, dispatched: input.result.ok },
      { id: input.id, ...input.previous }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.updateProductionRequests({
      id: previous.id,
      status: previous.status as "pending_dispatch",
      dispatch_attempts: previous.dispatch_attempts,
      last_error: previous.last_error,
      external_id: null,
    })
  }
)
