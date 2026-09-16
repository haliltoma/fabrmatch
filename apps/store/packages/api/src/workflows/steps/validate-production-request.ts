import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type ValidateProductionRequestInput = { production_request_external_id: string }
export type ValidateProductionRequestOutput = { order_id: string }

/** Anlaşmazlık, Sistem B'nin bildiği bir üretim talebine (`pr_...`) referans vermeli. */
export const validateProductionRequestStep = createStep(
  "validate-production-request-for-dispute",
  async (
    input: ValidateProductionRequestInput,
    { container }
  ): Promise<StepResponse<ValidateProductionRequestOutput, never>> => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const [request] = await service.listProductionRequests({
      external_id: input.production_request_external_id,
    })
    if (!request) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Production request ${input.production_request_external_id} is unknown`
      )
    }
    return new StepResponse({ order_id: request.order_id })
  }
)
