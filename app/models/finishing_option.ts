import { column } from '@adonisjs/lucid/orm'
import { FinishingOptionSchema } from '#database/schema'

export default class FinishingOption extends FinishingOptionSchema {
  /** material codes it suits; null = any. jsonb arrays need an explicit JSON string on write. */
  @column({
    prepare: (value: string[] | null) => (value === null ? null : JSON.stringify(value)),
    consume: (value: string | string[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare materials: string[] | null
}
