import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateCommissionRatesWorkflow } from "@mercurjs/core/workflows";

/**
 * Fabrmatch platform komisyonu (05-PRD, 07 kararı 2026-09-16): global oran %30 —
 * satıcının kalan %70'i kendi marjı, platformun tuttuğu %30 üretici ödemesini ve
 * platform payını karşılar (bkz. docs/07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md).
 */
const PLATFORM_COMMISSION_PERCENT = 30;

export default async function setPlatformCommission({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: rates } = await query.graph({
    entity: "commission_rate",
    fields: ["id", "is_default", "value"],
    filters: { is_default: true },
  });
  const defaultRate = rates[0];
  if (!defaultRate) {
    throw new Error("No default commission rate found — was the store seeded?");
  }

  await updateCommissionRatesWorkflow(container).run({
    input: [{ id: defaultRate.id, value: PLATFORM_COMMISSION_PERCENT }],
  });

  logger.info(
    `Global commission rate ${defaultRate.id} updated: ${defaultRate.value}% -> ${PLATFORM_COMMISSION_PERCENT}%`
  );
}
