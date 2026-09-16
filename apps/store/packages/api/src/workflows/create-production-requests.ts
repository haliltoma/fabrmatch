import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  createProductionRequestsStep,
  type CreateProductionRequestsInput,
} from "./steps/create-production-requests"

export const createProductionRequestsWorkflow = createWorkflow(
  "create-production-requests",
  function (input: CreateProductionRequestsInput) {
    const productionRequests = createProductionRequestsStep(input)

    return new WorkflowResponse(productionRequests)
  }
)
