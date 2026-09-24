import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw('alter table disputes drop constraint if exists disputes_resolution_check')
    this.schema.raw(
      `alter table disputes add constraint disputes_resolution_check check (resolution in ('full_refund','partial_refund','release','reproduce'))`
    )
    this.schema.alterTable('production_jobs', (table) => {
      // why a job was cancelled; a reprint after a dispute still counts against that maker
      table.string('cancel_reason', 40).nullable()
    })
  }

  async down() {
    this.schema.alterTable('production_jobs', (table) => {
      table.dropColumn('cancel_reason')
    })
    this.schema.raw('alter table disputes drop constraint if exists disputes_resolution_check')
    this.schema.raw(
      `alter table disputes add constraint disputes_resolution_check check (resolution in ('full_refund','partial_refund','release'))`
    )
  }
}
