import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260916072456 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "dispute" ("id" text not null, "production_request_external_id" text not null, "order_id" text not null, "status" text check ("status" in ('open', 'resolved_manufacturer', 'resolved_buyer', 'dismissed')) not null default 'open', "reason" text not null, "opened_by" text not null, "opened_at" timestamptz not null, "resolved_at" timestamptz null, "resolved_by" text null, "resolution_note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dispute_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispute_deleted_at" ON "dispute" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "payout_instruction" drop constraint if exists "payout_instruction_status_check";`);

    this.addSql(`alter table if exists "payout_instruction" add column if not exists "release_at" timestamptz null;`);
    this.addSql(`alter table if exists "payout_instruction" add constraint "payout_instruction_status_check" check("status" in ('received', 'on_hold', 'paid', 'cancelled', 'failed'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dispute" cascade;`);

    this.addSql(`alter table if exists "payout_instruction" drop constraint if exists "payout_instruction_status_check";`);

    this.addSql(`alter table if exists "payout_instruction" drop column if exists "release_at";`);

    this.addSql(`alter table if exists "payout_instruction" add constraint "payout_instruction_status_check" check("status" in ('received', 'paid', 'failed'));`);
  }

}
