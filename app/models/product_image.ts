import { ProductImageSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ModelFile from '#models/model_file'

/** `colour_render`: one picture per colour a product is offered in (W3) */
export type ProductImageKind = 'render' | 'maker_photo' | 'colour_render'
export type ProductImageStatus = 'approved' | 'pending' | 'rejected'

export default class ProductImage extends ProductImageSchema {
  declare kind: ProductImageKind
  declare status: ProductImageStatus

  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>
}
