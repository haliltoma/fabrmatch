import {
  validateAndTransformBody,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifySignature,
  WEBHOOK_STATUSES,
} from "../../../lib/fabrmatch-contract"

export const ProductionStatusWebhookSchema = z.object({
  event_id: z.string().min(1),
  sistem_a_order_ref: z.string().min(1),
  sistem_a_line_item_ref: z.string().min(1),
  production_request_id: z.string().min(1),
  status: z.enum(WEBHOOK_STATUSES),
  occurred_at: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "must be an ISO 8601 date"),
  tracking_number: z.string().nullish(),
  production_photos: z.array(z.string()).nullish(),
  payout_instruction: z
    .object({
      instruction_id: z.string().min(1),
      amount: z.number().nonnegative(),
      currency_code: z.string().length(3),
      manufacturer_account: z
        .object({
          provider: z.literal("stripe"),
          account_id: z.string().min(1),
        })
        .nullish(),
    })
    .nullish(),
})

export type ProductionStatusWebhookSchema = z.infer<typeof ProductionStatusWebhookSchema>

export function verifyFabrmatchSignature(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const valid = verifySignature({
    secret: process.env.FABRMATCH_WEBHOOK_SECRET,
    timestamp: req.get(TIMESTAMP_HEADER),
    signature: req.get(SIGNATURE_HEADER),
    rawBody: req.rawBody,
  })
  if (!valid) {
    res.status(401).json({ type: "unauthorized", message: "Invalid webhook signature" })
    return
  }
  next()
}

export const productionStatusWebhookMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/webhooks/production-status",
    method: "POST",
    bodyParser: { preserveRawBody: true },
    middlewares: [verifyFabrmatchSignature, validateAndTransformBody(ProductionStatusWebhookSchema)],
  },
]
