import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyProductionStatusWorkflow } from "../../../workflows/apply-production-status"
import type { ProductionStatusWebhookSchema } from "./middlewares"

/** Akış 2: Sistem B → Sistem A üretim durumu webhook'u (imza middleware'de doğrulanır). */
export async function POST(req: MedusaRequest<ProductionStatusWebhookSchema>, res: MedusaResponse) {
  const { result } = await applyProductionStatusWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(200).json({ received: true, ...result })
}
