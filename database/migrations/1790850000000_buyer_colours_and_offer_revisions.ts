import { BaseSchema } from '@adonisjs/lucid/schema'

const BEFORE = ['pending', 'accepted', 'declined', 'expired', 'countered']
/** revision: the maker asked the buyer to change something and the offer waits for the answer */
const AFTER = [...BEFORE, 'revision']
const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

/**
 * Paket Y: the buyer picks the colour(s), the maker accepts, declines or asks for a revision, and
 * every free text between the two passes a contact-detail check.
 */
export default class extends BaseSchema {
  private statuses(values: string[]) {
    this.schema.raw('alter table match_offers drop constraint if exists match_offers_status_check')
    this.schema.raw(
      `alter table match_offers add constraint match_offers_status_check check (status in (${list(values)}))`
    )
  }

  async up() {
    this.statuses(AFTER)

    this.schema.alterTable('order_items', (table) => {
      // [{ name: 'Red', part: 'head' }, …]; `color` keeps the first one (older readers, matching)
      table.jsonb('colours').notNullable().defaultTo('[]')
      // per unit, order currency like finishing_minor: the extra colours' work, in the maker share
      table.integer('colour_extra_minor').notNullable().defaultTo(0)
      // what the buyer wants the maker to know (moderated)
      table.text('buyer_note').nullable()
    })

    this.schema.createTable('offer_revisions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('match_offer_id')
        .notNullable()
        .references('id')
        .inTable('match_offers')
        .onDelete('CASCADE')
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE')
      table.text('request_body').notNullable()
      table.text('response_body').nullable()
      // open → answered | lapsed
      table.string('status', 20).notNullable().defaultTo('open')
      table.timestamp('answered_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['match_offer_id'])
      table.index(['order_id'])
    })

    this.schema.createTable('moderation_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('order_id').nullable().references('id').inTable('orders').onDelete('SET NULL')
      // where it was typed: order_message, revision_request, revision_response, buyer_note
      table.string('context', 40).notNullable()
      // contact, company, off_platform
      table.string('reason', 40).notNullable()
      // rules (regex) or ai
      table.string('source', 10).notNullable()
      table.text('text_enc').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['user_id', 'created_at'])
    })
  }

  async down() {
    this.schema.raw("update match_offers set status = 'declined' where status = 'revision'")
    this.statuses(BEFORE)
    this.schema.dropTable('moderation_events')
    this.schema.dropTable('offer_revisions')
    this.schema.alterTable('order_items', (table) => {
      table.dropColumn('colours')
      table.dropColumn('colour_extra_minor')
      table.dropColumn('buyer_note')
    })
  }
}
