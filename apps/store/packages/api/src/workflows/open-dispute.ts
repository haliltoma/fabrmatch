import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createDisputeStep } from "./steps/create-dispute"
import { holdPayoutForDisputeStep } from "./steps/hold-payout-for-dispute"
import { validateProductionRequestStep } from "./steps/validate-production-request"

export type OpenDisputeInput = {
  production_request_external_id: string
  reason: string
  opened_by: string
}

/** 05-PRD "kanıta dayalı anlaşmazlık çözüm süreci": şimdilik admin, alıcı adına açar. */
export const openDisputeWorkflow = createWorkflow(
  "open-dispute",
  function (input: OpenDisputeInput) {
    const validated = validateProductionRequestStep({
      production_request_external_id: input.production_request_external_id,
    })

    const disputeInput = transform({ input, validated }, ({ input, validated }) => ({
      production_request_external_id: input.production_request_external_id,
      order_id: validated.order_id,
      reason: input.reason,
      opened_by: input.opened_by,
    }))
    const dispute = createDisputeStep(disputeInput)

    const holdInput = transform({ input }, ({ input }) => ({
      production_request_external_id: input.production_request_external_id,
    }))
    const held = holdPayoutForDisputeStep(holdInput)

    const result = transform({ dispute, held }, ({ dispute, held }) => ({
      dispute_id: dispute.id,
      held_payout_instruction_id: held.held_payout_instruction_id,
    }))

    return new WorkflowResponse(result)
  }
)
