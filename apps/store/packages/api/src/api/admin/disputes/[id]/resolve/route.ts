import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveDisputeWorkflow } from "../../../../../workflows/resolve-dispute"
import type { ResolveDisputeSchema } from "../../middlewares"

export async function POST(req: AuthenticatedMedusaRequest<ResolveDisputeSchema>, res: MedusaResponse) {
  const { result } = await resolveDisputeWorkflow(req.scope).run({
    input: {
      dispute_id: req.params.id,
      resolution: req.validatedBody.resolution,
      resolved_by: req.auth_context.actor_id,
      resolution_note: req.validatedBody.resolution_note,
    },
  })

  res.json(result)
}
