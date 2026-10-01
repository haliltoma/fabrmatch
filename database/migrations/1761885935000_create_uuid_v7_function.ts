import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Every table's primary key is a UUIDv7 (K-U, 2026-10-01): unguessable in URLs and APIs, yet
 * time-ordered, so new rows land at the end of the index like a sequence would (random v4 keys
 * scatter inserts and fragment B-tree indexes). Postgres 16 has no native uuidv7(), so this builds
 * one from gen_random_uuid() following RFC 9562 "method 3": 48 bits of Unix milliseconds, the
 * version nibble 7, then 12 bits of sub-millisecond fraction (~244 ns steps) so rows created one
 * after another sort in creation order like the old sequence did; the rest stays random.
 * Tables use it as `default uuid_generate_v7()`; Lucid reads the id back with RETURNING.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      create or replace function uuid_generate_v7() returns uuid
      language plpgsql volatile parallel safe as $$
      declare
        now_ms numeric := extract(epoch from clock_timestamp()) * 1000;
        ms bigint := floor(now_ms);
        sub int := floor((now_ms - ms) * 4096);
        b bytea := uuid_send(gen_random_uuid());
      begin
        b := overlay(b placing substring(int8send(ms) from 3) from 1 for 6);
        b := set_byte(b, 6, 112 | (sub >> 8));
        b := set_byte(b, 7, sub & 255);
        return encode(b, 'hex')::uuid;
      end
      $$
    `)
  }

  async down() {
    this.schema.raw('drop function if exists uuid_generate_v7()')
  }
}
