import { OrderItemSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import ModelFile from '#models/model_file'
import type { PrinterTechnology } from '#models/printer'

/** One filament colour the buyer chose and, for a multi-colour print, the part it is for. */
export interface ItemColour {
  name: string
  part: string | null
}

export default class OrderItem extends OrderItemSchema {
  declare technology: PrinterTechnology

  /** jsonb arrays need an explicit JSON string on write */
  @column({
    prepare: (value: ItemColour[]) => JSON.stringify(value),
    consume: (value: string | ItemColour[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare colours: ItemColour[]

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>
}
