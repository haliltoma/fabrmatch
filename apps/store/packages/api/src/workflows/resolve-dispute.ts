import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { settleDisputePayoutStep, type DisputeResolution } from "./steps/settle-dispute-payout"
import { updateDisputeStatusStep } from "./steps/update-dispute-status"

export type ResolveDisputeInput = {
  dispute_id: string
  resolution: DisputeResolution
  resolved_by: string
  resolution_note?: string | null
}

export const resolveDisputeWorkflow = createWorkflow(
  "resolve-dispute",
  function (input: ResolveDisputeInput) {
    const updated = updateDisputeStatusStep(input)

    const settleInput = transform({ input, updated }, ({ input, updated }) => ({
      production_request_external_id: updated.production_request_external_id,
      resolution: input.resolution,
    }))
    const settled = settleDisputePayoutStep(settleInput)

    const result = transform({ updated, settled }, ({ updated, settled }) => ({
      dispute_id: updated.id,
      payout_instruction_id: settled.payout_instruction_id,
      payout_status: settled.payout_status,
    }))

    return new WorkflowResponse(result)
  }
)
