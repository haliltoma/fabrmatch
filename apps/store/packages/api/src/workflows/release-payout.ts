import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { executePayoutStep } from "./steps/execute-payout"

export type ReleasePayoutInput = { payoutInstructionId: string }

/** Bekleme penceresi dolan bir talimatı serbest bırakır (bkz. release-due-payouts job). */
export const releasePayoutWorkflow = createWorkflow(
  "release-payout",
  function (input: ReleasePayoutInput) {
    const executed = executePayoutStep({ payoutInstructionId: input.payoutInstructionId })
    return new WorkflowResponse(executed)
  }
)
