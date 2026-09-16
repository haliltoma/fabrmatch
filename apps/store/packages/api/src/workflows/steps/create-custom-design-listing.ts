import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createOffersWorkflow, createProductsWorkflow } from "@mercurjs/core/workflows"
import { ProductStatus, type CreateProductDTO } from "@mercurjs/types"
import {
  buildCustomDesignMetadata,
  buildCustomHandle,
  buildCustomSku,
  buildVariantTitle,
  computeCustomDesignPrice,
  parseCustomDesignMarkup,
  type CustomDesignAnalysis,
} from "../../lib/custom-design-listing"
import type { ResolvedPlatformSeller } from "./resolve-platform-seller"

const MATERIAL_OPTION = "Malzeme"
const CURRENCY_CODE = "try"
const VIRTUAL_STOCK = 1_000_000

export type CreateCustomDesignListingStepInput = {
  name: string
  analysis: CustomDesignAnalysis
  seller: ResolvedPlatformSeller
}

export type CustomDesignListing = {
  product_id: string
  variant_id: string
  offer_id: string
  amount: number
  currency_code: string
}

type VariantRow = { id: string }

/**
 * Analiz sonucundan tek seferlik bir ürün + TRY teklif oluşturur. Sepet satırı ucu
 * (Medusa addToCartWorkflow) ürünü PUBLISHED zorladığı için ürün published açılır ama
 * vitrin kataloğu metadata.custom_design olanları gizler (docs/07, 2026-09-16).
 */
export const createCustomDesignListingStep = createStep(
  "create-custom-design-listing",
  async ({ name, analysis, seller }: CreateCustomDesignListingStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const markup = parseCustomDesignMarkup(
      process.env.CUSTOM_DESIGN_MARKUP ? Number(process.env.CUSTOM_DESIGN_MARKUP) : undefined
    )
    const amount = computeCustomDesignPrice(analysis.cost.total_cost, markup)
    const metadata = buildCustomDesignMetadata(analysis)
    const randomSuffix = Math.random().toString(36).slice(2, 10).padEnd(8, "0")
    const sku = buildCustomSku(analysis.design_hash, analysis.params.material, randomSuffix)

    // Varyant ekseni Mercur product attribute'u üzerinden bağlanır (seed deseni);
    // attribute verilmezse ürün axis'siz doğar ve varyant seçenekleri uyuşmaz
    const { data: materialAttributes } = await query.graph({
      entity: "product_attribute",
      fields: ["id", "handle", "values.id", "values.name"],
      filters: { handle: "material", product_id: null },
    })
    const materialAttribute = materialAttributes[0] as
      | { id: string; values: { id: string; name: string }[] }
      | undefined
    const materialValueId = materialAttribute?.values.find(
      (value) => value.name === analysis.params.material
    )?.id
    if (!materialAttribute || !materialValueId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Material attribute value "${analysis.params.material}" was not found`
      )
    }

    const product: CreateProductDTO = {
      title: name,
      handle: buildCustomHandle(analysis.design_hash, randomSuffix),
      status: ProductStatus.PUBLISHED,
      weight: analysis.estimate.part_weight_g,
      metadata,
      attributes: [{ id: materialAttribute.id, value_ids: [materialValueId] }],
      variants: [
        {
          title: buildVariantTitle(analysis.params.material, analysis.params.quantity),
          sku,
          options: { [MATERIAL_OPTION]: analysis.params.material },
        },
      ],
    }

    const { result: createdProducts } = await createProductsWorkflow(container).run({
      input: { created_by: seller.member_id, products: [product] },
    })
    const productId = createdProducts[0]?.id
    if (!productId) {
      throw new Error("Custom design product was not created")
    }

    // Varyantı geri sorgula — createOffersWorkflow variant_id ister
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "variants.id"],
      filters: { id: productId },
    })
    const variantId = (products[0]?.variants as VariantRow[] | undefined)?.[0]?.id
    if (!variantId) {
      throw new Error(`Variant for custom design product ${productId} was not found`)
    }

    const { result: offers } = await createOffersWorkflow(container).run({
      input: {
        offers: [
          {
            seller_id: seller.seller_id,
            created_by: seller.member_id,
            sku,
            variant_id: variantId,
            shipping_profile_id: seller.shipping_profile_id,
            inventory_items: [
              {
                sku,
                stock_levels: [{ location_id: seller.stock_location_id, stocked_quantity: VIRTUAL_STOCK }],
              },
            ],
            prices: [{ amount, currency_code: CURRENCY_CODE }],
          },
        ],
      },
    })
    const offerId = offers[0]?.id
    if (!offerId) {
      throw new Error(`Offer for custom design product ${productId} was not created`)
    }

    return new StepResponse(
      {
        product_id: productId,
        variant_id: variantId,
        offer_id: offerId,
        amount,
        currency_code: CURRENCY_CODE,
      } satisfies CustomDesignListing,
      { product_id: productId, offer_id: offerId }
    )
  }
)
