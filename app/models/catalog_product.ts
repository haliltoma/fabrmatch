import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Category from '#models/category'
import ModelFile from '#models/model_file'
import { DateTime } from 'luxon'

export default class CatalogProduct extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare modelFileId: string | null

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare allowedMaterials: string[]

  @column({
    prepare: (value: number[]) => JSON.stringify(value),
    consume: (value: string | number[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare allowedScales: number[]

  @column()
  declare categoryId: string | null

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare tags: string[]

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>
}
