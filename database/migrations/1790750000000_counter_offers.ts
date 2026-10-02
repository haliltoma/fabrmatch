import { BaseSchema } from '@adonisjs/lucid/schema'

const BEFORE = ['pending', 'accepted', 'declined', 'expired']
/** Paket V (V3): the maker asked for more; an admin decides before the counter runs out. */
const AFTER = [...BEFORE, 'countered']
const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

export default class extends BaseSchema {
  private statuses(values: string[]) {
    this.schema.raw('alter table match_offers drop constraint if exists match_offers_status_check')
    this.schema.raw(
      `alter table match_offers add constraint match_offers_status_check check (status in (${list(values)}))`
    )
  }

  async up() {
    this.schema.alterTable('match_offers', (table) => {
      // what the maker asked instead (TRY, like maker_pay_minor)
      table.integer('counter_pay_minor').nullable()
    })
    this.statuses(AFTER)
  }

  async down() {
    this.schema.raw("update match_offers set status = 'declined' where status = 'countered'")
    this.statuses(BEFORE)
    this.schema.alterTable('match_offers', (table) => {
      table.dropColumn('counter_pay_minor')
    })
  }
}
