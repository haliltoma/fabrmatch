import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createShippingProfilesWorkflow } from "@medusajs/medusa/core-flows"

export const PLATFORM_SELLER_SHIPPING_PROFILE = "Marketplace Shipping"

export type ResolvedPlatformSeller = {
  seller_id: string
  member_id: string
  stock_location_id: string
  shipping_profile_id: string
}

type SellerRow = {
  id: string
  stock_locations?: { id: string }[] | null
}

/**
 * Özel tasarım listelemelerini yapacak platform satıcısını çözer (env: PLATFORM_SELLER_EMAIL).
 * Satıcı onaylı olmalı ve bir stok konumuna bağlı olmalı (seed deseni, bkz. src/scripts/seed.ts).
 */
export const resolvePlatformSellerStep = createStep(
  "resolve-platform-seller",
  async (_, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const email = process.env.PLATFORM_SELLER_EMAIL
    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PLATFORM_SELLER_EMAIL is not configured — cannot create a custom design listing"
      )
    }

    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: ["id", "status", "stock_locations.id"],
      filters: { email },
    })
    const seller = (sellers as (SellerRow & { status?: string })[] | undefined)?.[0]
    if (!seller) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Platform seller "${email}" was not found`)
    }
    // Mercur'da onaylı satıcının statusu "open" (SellerStatus.OPEN)
    if (seller.status !== "open") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Platform seller "${email}" is not approved (status: ${seller.status})`
      )
    }
    const stockLocationId = seller.stock_locations?.[0]?.id
    if (!stockLocationId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Platform seller "${email}" has no stock location`
      )
    }

    const { data: members } = await query.graph({
      entity: "member",
      fields: ["id"],
      filters: { email },
    })
    const memberId = members[0]?.id
    if (!memberId) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Member for "${email}" was not found`)
    }

    const { data: profiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
      filters: { name: PLATFORM_SELLER_SHIPPING_PROFILE },
    })
    let shippingProfileId = profiles[0]?.id as string | undefined
    if (!shippingProfileId) {
      const { result } = await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: PLATFORM_SELLER_SHIPPING_PROFILE, type: "default" }] },
      })
      shippingProfileId = result[0].id
    }

    return new StepResponse({
      seller_id: seller.id,
      member_id: memberId,
      stock_location_id: stockLocationId,
      shipping_profile_id: shippingProfileId,
    } satisfies ResolvedPlatformSeller)
  }
)
