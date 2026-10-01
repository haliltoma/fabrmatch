import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ModelFile from '#models/model_file'
import ManufacturerProfile from '#models/manufacturer_profile'

export default class FileAccessGrant extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare modelFileId: string

  @column()
  declare manufacturerProfileId: string

  @column()
  declare productionJobId: string | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column()
  declare maxDownloads: number

  @column()
  declare downloadCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>

  @belongsTo(() => ManufacturerProfile)
  declare manufacturerProfile: BelongsTo<typeof ManufacturerProfile>

  get isExpired(): boolean {
    return DateTime.now() > this.expiresAt
  }

  get hasDownloadsRemaining(): boolean {
    return this.downloadCount < this.maxDownloads
  }

  get isValid(): boolean {
    return !this.isExpired && this.hasDownloadsRemaining
  }
}
