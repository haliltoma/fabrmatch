import { ProductionJobSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import FileAccessGrant from '#models/file_access_grant'
import JobQcPhoto from '#models/job_qc_photo'
import Order from '#models/order'
import ManufacturerProfile from '#models/manufacturer_profile'
import Printer from '#models/printer'

export type ProductionJobStatus =
  'accepted' | 'printing' | 'produced' | 'shipped' | 'delivered' | 'cancelled'

export default class ProductionJob extends ProductionJobSchema {
  declare status: ProductionJobStatus

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => ManufacturerProfile)
  declare manufacturerProfile: BelongsTo<typeof ManufacturerProfile>

  @belongsTo(() => Printer)
  declare printer: BelongsTo<typeof Printer>

  @hasMany(() => JobQcPhoto)
  declare qcPhotos: HasMany<typeof JobQcPhoto>

  @hasMany(() => FileAccessGrant)
  declare grants: HasMany<typeof FileAccessGrant>
}
