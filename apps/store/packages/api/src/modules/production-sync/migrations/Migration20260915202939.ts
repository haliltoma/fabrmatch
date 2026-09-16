import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260915202939 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "production_request" add column if not exists "print_estimate" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "production_request" drop column if exists "print_estimate";`);
  }

}
