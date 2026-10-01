import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Every table's primary key is a UUIDv7 (K-U, 2026-10-01): unguessable in URLs and APIs, yet
 * time-ordered, so new rows land at the end of the index like a sequence would (random v4 keys
 * scatter inserts and fragment B-tree indexes). Postgres 16 has no native uuidv7(), so this builds
 * one from gen_random_uuid(): the first 48 bits become the millisecond Unix time and the version
 * bits are set to 7. Tables use it as `default uuid_generate_v7()`; Lucid reads the id back with
 * RETURNING, so models need no id code.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      create or replace function uuid_generate_v7() returns uuid
      language sql volatile parallel safe as $$
        select encode(
          set_bit(
            set_bit(
              overlay(
                uuid_send(gen_random_uuid())
                placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
                from 1 for 6
              ),
              52, 1
            ),
            53, 1
          ),
          'hex'
        )::uuid
      $$
    `)
  }

  async down() {
    this.schema.raw('drop function if exists uuid_generate_v7()')
  }
}
