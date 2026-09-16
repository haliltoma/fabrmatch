import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { recordDispatchResultStep } from "./steps/record-dispatch-result"
import {
  sendProductionRequestStep,
  type SendProductionRequestInput,
} from "./steps/send-production-request"

export const dispatchProductionRequestWorkflow = createWorkflow(
  "dispatch-production-request",
  function (input: SendProductionRequestInput) {
    const sent = sendProductionRequestStep(input)
    const recorded = recordDispatchResultStep(sent)

    return new WorkflowResponse(recorded)
  }
)
