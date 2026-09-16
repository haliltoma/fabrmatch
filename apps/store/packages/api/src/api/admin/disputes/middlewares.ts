import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const CreateDisputeSchema = z.object({
  production_request_external_id: z.string().min(1),
  reason: z.string().min(1),
})
export type CreateDisputeSchema = z.infer<typeof CreateDisputeSchema>

export const ResolveDisputeSchema = z.object({
  resolution: z.enum(["manufacturer", "buyer", "dismiss"]),
  resolution_note: z.string().nullish(),
})
export type ResolveDisputeSchema = z.infer<typeof ResolveDisputeSchema>

export const disputeMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/disputes",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateDisputeSchema)],
  },
  {
    matcher: "/admin/disputes/:id/resolve",
    method: "POST",
    middlewares: [validateAndTransformBody(ResolveDisputeSchema)],
  },
]
