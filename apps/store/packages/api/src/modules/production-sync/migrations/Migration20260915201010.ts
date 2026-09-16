import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260915201010 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "production_request" drop constraint if exists "production_request_external_id_unique";`);
    this.addSql(`alter table if exists "production_request" drop constraint if exists "production_request_line_item_id_unique";`);
    this.addSql(`alter table if exists "payout_instruction" drop constraint if exists "payout_instruction_instruction_id_unique";`);
    this.addSql(`create table if not exists "payout_instruction" ("id" text not null, "instruction_id" text not null, "production_request_external_id" text not null, "order_id" text not null, "amount" numeric not null, "currency_code" text not null, "status" text check ("status" in ('received', 'paid', 'failed')) not null default 'received', "paid_at" timestamptz null, "failure_reason" text null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payout_instruction_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payout_instruction_instruction_id_unique" ON "payout_instruction" ("instruction_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payout_instruction_deleted_at" ON "payout_instruction" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "production_request" ("id" text not null, "order_id" text not null, "line_item_id" text not null, "design_reference" text not null, "material" text not null, "color" text null, "quantity" integer not null, "buyer_country" text not null, "buyer_city" text null, "requested_delivery_by" timestamptz not null, "external_id" text null, "status" text check ("status" in ('pending_dispatch', 'dispatch_failed', 'matching_in_progress', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered')) not null default 'pending_dispatch', "tracking_number" text null, "production_photos" jsonb null, "dispatch_attempts" integer not null default 0, "last_error" text null, "last_event_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "production_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_production_request_line_item_id_unique" ON "production_request" ("line_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_production_request_external_id_unique" ON "production_request" ("external_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_production_request_deleted_at" ON "production_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_production_request_order_id" ON "production_request" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_production_request_status" ON "production_request" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payout_instruction" cascade;`);

    this.addSql(`drop table if exists "production_request" cascade;`);
  }

}
