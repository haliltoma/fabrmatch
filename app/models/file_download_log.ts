import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import FileAccessGrant from '#models/file_access_grant'

export default class FileDownloadLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare grantId: string

  @column()
  declare manufacturerProfileId: string

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => FileAccessGrant)
  declare grant: BelongsTo<typeof FileAccessGrant>
}
