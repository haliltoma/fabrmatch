import { authenticate, validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU"] as const

// services/geometry /v1/analyze yanıtının sepete ekleme için gereken alt kümesi.
// Yanıtın tamamı taşınmaz; STL saklanmaz (docs/07, 2026-09-16).
export const StorePostCustomDesignsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  analysis: z.object({
    design_hash: z.string().regex(/^[0-9a-f]{64}$/),
    params: z.object({
      material: z.enum(MATERIALS),
      infill_percent: z.number().min(5).max(100),
      layer_height_mm: z.number().min(0.08).max(0.32),
      quantity: z.number().int().min(1).max(1000),
    }),
    estimate: z.object({
      slicer: z.string().min(1),
      part_weight_g: z.number().nonnegative(),
      support_weight_g: z.number().nonnegative(),
      print_time_minutes: z.number().nonnegative(),
    }),
    manufacturability: z.object({
      manufacturable: z.boolean(),
    }),
    cost: z.object({
      // services/geometry Intl-uyumlu "TRY" döndürür — küçük harfe indirgenir
      currency: z
        .string()
        .transform((value) => value.toLowerCase())
        .pipe(z.literal("try")),
      total_cost: z.number().positive(),
      quantity: z.number().int().min(1),
      unit_cost: z.number().nonnegative(),
    }),
  }),
})
export type StorePostCustomDesigns = z.infer<typeof StorePostCustomDesignsSchema>

export const customDesignsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/custom-designs",
    method: "POST",
    middlewares: [
      authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
      validateAndTransformBody(StorePostCustomDesignsSchema),
    ],
  },
]
