import { CartItemSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ModelFile from '#models/model_file'

export default class CartItem extends CartItemSchema {
  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>
}
