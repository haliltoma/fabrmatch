import { MedusaService } from "@medusajs/framework/utils"
import Dispute from "./models/dispute"
import InboundWebhookEvent from "./models/inbound-webhook-event"
import PayoutInstruction from "./models/payout-instruction"
import ProductionRequest from "./models/production-request"
import ReconciliationReport from "./models/reconciliation-report"

class ProductionSyncModuleService extends MedusaService({
  ProductionRequest,
  PayoutInstruction,
  InboundWebhookEvent,
  ReconciliationReport,
  Dispute,
}) {}

export default ProductionSyncModuleService
