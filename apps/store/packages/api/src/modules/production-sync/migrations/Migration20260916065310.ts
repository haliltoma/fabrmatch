import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260916065310 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "inbound_webhook_event" drop constraint if exists "inbound_webhook_event_event_id_unique";`);
    this.addSql(`create table if not exists "inbound_webhook_event" ("id" text not null, "event_id" text not null, "production_request_external_id" text not null, "status" text not null, "received_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "inbound_webhook_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_inbound_webhook_event_event_id_unique" ON "inbound_webhook_event" ("event_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_inbound_webhook_event_deleted_at" ON "inbound_webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "reconciliation_report" ("id" text not null, "checked_at" timestamptz not null, "window_start" timestamptz not null, "sistem_b_event_count" integer not null, "matched_count" integer not null, "missing_event_ids" text[] not null, "has_anomalies" boolean not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "reconciliation_report_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_reconciliation_report_deleted_at" ON "reconciliation_report" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "payout_instruction" add column if not exists "manufacturer_account_id" text null, add column if not exists "provider" text null, add column if not exists "provider_reference" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "inbound_webhook_event" cascade;`);

    this.addSql(`drop table if exists "reconciliation_report" cascade;`);

    this.addSql(`alter table if exists "payout_instruction" drop column if exists "manufacturer_account_id", drop column if exists "provider", drop column if exists "provider_reference";`);
  }

}
