import type { BigNumberInput } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MathBN, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { parsePrintEstimate } from "../../lib/fabrmatch-contract"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

// Seed'deki varyant ekseni adları (Mercur attribute → Medusa product option)
const MATERIAL_OPTION = "Malzeme"
const COLOR_OPTION = "Renk"
const DEFAULT_LEAD_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type CreateProductionRequestsInput = { order_id: string }

type OrderRow = {
  id: string
  created_at: string | Date
  shipping_address?: { country_code?: string | null; city?: string | null } | null
  items?: ({ id: string; detail?: { quantity?: unknown } | null; variant_id?: string | null } | null)[] | null
}

type VariantRow = {
  id: string
  options?: ({ value: string; option?: { title: string } | null } | null)[] | null
  product?: { metadata?: Record<string, unknown> | null } | null
}

/**
 * Siparişin siparişe-göre-üretilen (metadata.design_reference olan) kalemleri için
 * `pending_dispatch` üretim talepleri açar. Aynı kalem için tekrar çalışırsa yeni kayıt açmaz.
 */
export const createProductionRequestsStep = createStep(
  "create-production-requests",
  async ({ order_id }: CreateProductionRequestsInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "created_at",
        "shipping_address.country_code",
        "shipping_address.city",
        "items.id",
        // Order modülü kalem miktarını order_item (detail) join'inden hesaplıyor;
        // detail istenmezse items.quantity hiç dolmuyor
        "items.detail.quantity",
        "items.variant_id",
      ],
      filters: { id: order_id },
    })
    const order = orders[0] as OrderRow | undefined
    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${order_id} was not found`)
    }

    const items = (order.items ?? []).filter(
      (item): item is { id: string; detail?: { quantity?: unknown } | null; variant_id: string } =>
        Boolean(item?.variant_id)
    )
    if (!items.length) {
      return new StepResponse([], [] as string[])
    }

    const existing = await service.listProductionRequests({ line_item_id: items.map((item) => item.id) })
    const alreadyCreated = new Set(existing.map((request) => request.line_item_id))
    const pending = items.filter((item) => !alreadyCreated.has(item.id))
    if (!pending.length) {
      return new StepResponse([], [] as string[])
    }

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "options.value", "options.option.title", "product.metadata"],
      filters: { id: pending.map((item) => item.variant_id) },
    })
    const variantById = new Map((variants as VariantRow[]).map((variant) => [variant.id, variant]))
    const requestedDeliveryBy = new Date(new Date(order.created_at).getTime() + DEFAULT_LEAD_DAYS * DAY_MS)

    const toCreate = pending.flatMap((item) => {
      const variant = variantById.get(item.variant_id)
      const designReference = variant?.product?.metadata?.design_reference
      // Miktar sayı veya BigNumber ham değeri ({ value, precision }) olarak gelebilir
      const quantity = MathBN.convert((item.detail?.quantity ?? 0) as BigNumberInput).toNumber()
      if (typeof designReference !== "string" || !Number.isFinite(quantity) || quantity <= 0) {
        return []
      }
      const optionValue = (title: string) =>
        variant?.options?.find((option) => option?.option?.title === title)?.value ?? null

      return [
        {
          order_id: order.id,
          line_item_id: item.id,
          design_reference: designReference,
          material: optionValue(MATERIAL_OPTION) ?? "PLA",
          color: optionValue(COLOR_OPTION),
          quantity,
          buyer_country: (order.shipping_address?.country_code ?? "tr").toUpperCase(),
          buyer_city: order.shipping_address?.city ?? null,
          requested_delivery_by: requestedDeliveryBy,
          print_estimate: parsePrintEstimate(variant?.product?.metadata?.print_profile),
        },
      ]
    })
    if (!toCreate.length) {
      return new StepResponse([], [] as string[])
    }

    const created = await service.createProductionRequests(toCreate)
    return new StepResponse(
      created,
      created.map((request) => request.id)
    )
  },
  async (createdIds, { container }) => {
    if (!createdIds?.length) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.deleteProductionRequests(createdIds)
  }
)
