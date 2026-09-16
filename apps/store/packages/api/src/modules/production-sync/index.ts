import { Module } from "@medusajs/framework/utils"
import ProductionSyncModuleService from "./service"

export const PRODUCTION_SYNC_MODULE = "productionSync"

export default Module(PRODUCTION_SYNC_MODULE, {
  service: ProductionSyncModuleService,
})
