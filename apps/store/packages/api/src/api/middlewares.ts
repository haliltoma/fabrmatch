import { defineMiddlewares } from "@medusajs/framework/http"
import { disputeMiddlewares } from "./admin/disputes/middlewares"
import { productionStatusWebhookMiddlewares } from "./webhooks/production-status/middlewares"
import { customDesignsMiddlewares } from "./store/custom-designs/middlewares"

export default defineMiddlewares({
  routes: [...productionStatusWebhookMiddlewares, ...disputeMiddlewares, ...customDesignsMiddlewares],
})
