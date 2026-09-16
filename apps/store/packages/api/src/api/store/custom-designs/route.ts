import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createCustomDesignListingWorkflow } from "../../../workflows/create-custom-design-listing"
import type { StorePostCustomDesigns } from "./middlewares"

/**
 * POST /store/custom-designs — özel tasarım analizinden tek seferlik ürün + teklif oluşturur.
 * Girdi, vitrinin /api/custom-design proxy'sinden gelir (tarayıcı bu uca doğrudan gitmez).
 */
export const POST = async (
  req: MedusaRequest<StorePostCustomDesigns>,
  res: MedusaResponse
): Promise<void> => {
  const { name, analysis } = req.validatedBody

  if (!analysis.manufacturability.manufacturable) {
    res.status(422).json({ message: "Design is not manufacturable" })
    return
  }
  if (analysis.params.quantity !== analysis.cost.quantity) {
    res.status(422).json({ message: "params.quantity does not match cost.quantity" })
    return
  }

  const { result } = await createCustomDesignListingWorkflow(req.scope).run({
    input: { name, analysis },
  })

  res.status(201).json(result)
}
