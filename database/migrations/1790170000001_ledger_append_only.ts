import { BaseSchema } from '@adonisjs/lucid/schema'

/** The ledger is history: corrections are new balancing entries, never edits. */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      create or replace function ledger_forbid_change() returns trigger as $$
      begin
        raise exception 'ledger_entries is append-only';
      end;
      $$ language plpgsql
    `)
    this.schema.raw(`
      create trigger ledger_entries_append_only
        before update or delete on ledger_entries
        for each row execute function ledger_forbid_change()
    `)
  }

  async down() {
    this.schema.raw('drop trigger if exists ledger_entries_append_only on ledger_entries')
    this.schema.raw('drop function if exists ledger_forbid_change()')
  }
}
