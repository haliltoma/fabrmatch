import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260915201103 extends Migration {

  // jsonb → text[] doğrudan cast edilemiyor; sütun bu migration'dan önce hiç veri tutmadı.
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "production_request" drop column if exists "production_photos";`);
    this.addSql(`alter table if exists "production_request" add column if not exists "production_photos" text[] null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "production_request" drop column if exists "production_photos";`);
    this.addSql(`alter table if exists "production_request" add column if not exists "production_photos" jsonb null;`);
  }

}
