import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  createCustomDesignListingStep,
  type CreateCustomDesignListingStepInput,
  type CustomDesignListing,
} from "./steps/create-custom-design-listing"
import { resolvePlatformSellerStep } from "./steps/resolve-platform-seller"

type CreateCustomDesignListingWorkflowInput = Omit<CreateCustomDesignListingStepInput, "seller">

export const createCustomDesignListingWorkflow = createWorkflow(
  "create-custom-design-listing",
  function (input: CreateCustomDesignListingWorkflowInput) {
    const seller = resolvePlatformSellerStep()
    const listing = createCustomDesignListingStep({
      name: input.name,
      analysis: input.analysis,
      seller,
    })

    return new WorkflowResponse(listing as CustomDesignListing)
  }
)
