import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { recordInboundWebhookEventStep } from "./steps/record-inbound-webhook-event"
import { recordPayoutInstructionStep } from "./steps/record-payout-instruction"
import {
  updateProductionStatusStep,
  type ApplyProductionStatusInput,
} from "./steps/update-production-status"

export const applyProductionStatusWorkflow = createWorkflow(
  "apply-production-status",
  function (input: ApplyProductionStatusInput) {
    const status = updateProductionStatusStep(input)

    // Gelen-kutusu kaydı: yalnızca update-production-status talebi tanıdıktan sonra çalışır
    // (bilinmeyen production_request_id zaten yukarıda hata fırlatıp workflow'u durdurur)
    const inboundInput = transform({ input }, ({ input }) => ({
      event_id: input.event_id,
      production_request_id: input.production_request_id,
      status: input.status,
      occurred_at: input.occurred_at,
    }))
    recordInboundWebhookEventStep(inboundInput)

    // Ödeme burada HEMEN denenmez — talimat `received` olarak kaydedilir ve bekleme
    // penceresi (release_at) dolunca release-due-payouts job'ı serbest bırakır, ya da
    // bu arada bir anlaşmazlık açılırsa open-dispute iş akışı `on_hold`a alır.
    const payoutInput = transform({ input }, ({ input }) => ({
      order_id: input.sistem_a_order_ref,
      production_request_external_id: input.production_request_id,
      instruction: input.payout_instruction ?? null,
    }))
    const payout = recordPayoutInstructionStep(payoutInput)

    const result = transform({ status, payout }, ({ status, payout }) => ({
      status_applied: status.applied,
      payout_recorded: payout.recorded,
      payout_duplicate: payout.duplicate,
    }))

    return new WorkflowResponse(result)
  }
)
