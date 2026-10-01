/**
 * A stable, valid UUID for a test that needs an id it made up (an unknown row, a context field):
 * uid(7) is always 00000000-0000-7000-8000-000000000007. Real rows get UUIDv7 keys from Postgres.
 */
export const uid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`
