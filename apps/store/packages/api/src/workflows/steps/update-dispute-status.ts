import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"
import type { DisputeResolution } from "./settle-dispute-payout"

const RESOLUTION_TO_STATUS = {
  manufacturer: "resolved_manufacturer",
  buyer: "resolved_buyer",
  dismiss: "dismissed",
} as const

export type UpdateDisputeStatusInput = {
  dispute_id: string
  resolution: DisputeResolution
  resolved_by: string
  resolution_note?: string | null
}

export type UpdateDisputeStatusOutput = { id: string; production_request_external_id: string }

/** Bir anlaşmazlık yalnızca `open` iken çözülebilir — tekrar çözme sessizce hata verir. */
export const updateDisputeStatusStep = createStep(
  "update-dispute-status",
  async (
    input: UpdateDisputeStatusInput,
    { container }
  ): Promise<StepResponse<UpdateDisputeStatusOutput, string | null>> => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const dispute = await service.retrieveDispute(input.dispute_id).catch(() => null)
    if (!dispute) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Dispute ${input.dispute_id} is unknown`)
    }
    if (dispute.status !== "open") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Dispute ${input.dispute_id} is already resolved (${dispute.status})`
      )
    }

    await service.updateDisputes({
      id: dispute.id,
      status: RESOLUTION_TO_STATUS[input.resolution],
      resolved_at: new Date(),
      resolved_by: input.resolved_by,
      resolution_note: input.resolution_note ?? null,
    })

    return new StepResponse(
      { id: dispute.id, production_request_external_id: dispute.production_request_external_id },
      dispute.id
    )
  },
  async (disputeId, { container }) => {
    if (!disputeId) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.updateDisputes({
      id: disputeId,
      status: "open",
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
    })
  }
)
