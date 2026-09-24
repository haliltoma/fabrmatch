import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import type { DfmIssue } from '#services/files/dfm_analyzer'

export type ModelFileFormat = 'STL' | '3MF' | 'OBJ'
export type AnalysisStatus = 'pending' | 'processing' | 'done' | 'failed'

export default class ModelFile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ownerId: number

  /** the revision this file replaces, if it is a newer version of the same model */
  @column()
  declare previousFileId: number | null

  @column()
  declare revision: number

  @column()
  declare storageKey: string

  @column({
    prepare: (value: DfmIssue[]) => JSON.stringify(value),
    consume: (value: string | DfmIssue[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare dfmIssues: DfmIssue[]

  @column.dateTime()
  declare blockedAt: DateTime | null

  @column()
  declare blockedReason: string | null

  @column()
  declare originalName: string

  @column()
  declare format: ModelFileFormat

  @column()
  declare sizeBytes: number

  @column({ columnName: 'sha256' })
  declare sha256: string

  @column({ columnName: 'volume_mm3' })
  declare volumeMm3: number | null

  @column()
  declare bboxXMm: number | null

  @column()
  declare bboxYMm: number | null

  @column()
  declare bboxZMm: number | null

  @column()
  declare triangleCount: number | null

  @column()
  declare analysisStatus: AnalysisStatus

  @column()
  declare isPrintable: boolean | null

  @column()
  declare analysisError: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare owner: BelongsTo<typeof User>
}
