import { OrderItemSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import ModelFile from '#models/model_file'
import type { PrinterTechnology } from '#models/printer'

export default class OrderItem extends OrderItemSchema {
  declare technology: PrinterTechnology

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>
}
