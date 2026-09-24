#!/usr/bin/env bash
# Restore drill (R5-T2): dump a database, restore it into a scratch database and prove the copy is
# complete and consistent. A backup nobody has restored is only a hope.
#
#   scripts/restore_drill.sh                      # local docker compose postgres
#   PG_CONTAINER= PGHOST=db.internal PGUSER=... PGPASSWORD=... SOURCE_DB=fabrmatch scripts/restore_drill.sh
#
# Exits non-zero (and says why) if anything differs. The scratch database is always removed.
set -euo pipefail

SOURCE_DB="${SOURCE_DB:-fabrmatch_dev}"
SCRATCH_DB="${SCRATCH_DB:-fabrmatch_restore_drill}"
PG_CONTAINER="${PG_CONTAINER-fabrmatch-adonis-postgres-1}"
PGUSER="${PGUSER:-postgres}"
DUMP="$(mktemp -t fabrmatch-drill.XXXXXX)"

# with PG_CONTAINER set, every client runs inside that container; otherwise on this machine
run() {
  if [ -n "$PG_CONTAINER" ]; then docker exec -i -e PGPASSWORD="${PGPASSWORD:-postgres}" "$PG_CONTAINER" "$@"
  else "$@"; fi
}
psql_in() { run psql -U "$PGUSER" -X -q -t -A -d "$1" -c "$2"; }

cleanup() { psql_in postgres "drop database if exists \"$SCRATCH_DB\"" >/dev/null 2>&1 || true; rm -f "$DUMP"; }
trap cleanup EXIT

case "$SCRATCH_DB" in *drill*|*scratch*) ;; *) echo "refusing: SCRATCH_DB must contain 'drill' or 'scratch'" >&2; exit 2;; esac
[ "$SOURCE_DB" != "$SCRATCH_DB" ] || { echo "source and scratch must differ" >&2; exit 2; }

echo "1/4 dumping $SOURCE_DB"
run pg_dump -U "$PGUSER" -Fc --no-owner "$SOURCE_DB" > "$DUMP"
[ -s "$DUMP" ] || { echo "FAIL: the dump is empty" >&2; exit 1; }

echo "2/4 restoring into $SCRATCH_DB"
psql_in postgres "drop database if exists \"$SCRATCH_DB\"" >/dev/null
psql_in postgres "create database \"$SCRATCH_DB\"" >/dev/null
run pg_restore -U "$PGUSER" --no-owner -d "$SCRATCH_DB" < "$DUMP"

echo "3/4 comparing"
fail=0
compare() { # label, sql — the same query must give the same answer on both sides
  local a b
  a="$(psql_in "$SOURCE_DB" "$2")"; b="$(psql_in "$SCRATCH_DB" "$2")"
  if [ "$a" = "$b" ]; then echo "   ok    $1 ($a)"; else echo "   FAIL  $1: source=$a restored=$b" >&2; fail=1; fi
}
compare "tables" "select count(*) from information_schema.tables where table_schema = 'public'"
compare "migrations applied" "select count(*) from adonis_schema"
for table in users orders order_items payments payouts ledger_entries production_jobs audit_logs; do
  if [ "$(psql_in "$SOURCE_DB" "select to_regclass('public.$table') is not null")" = "t" ]; then
    compare "rows in $table" "select count(*) from $table"
  fi
done
compare "ledger checksum" "select coalesce(sum(amount_minor * case when direction = 'debit' then 1 else -1 end), 0) || ':' || count(*) from ledger_entries"

echo "4/4 the restored books must balance (debits = credits, per currency)"
unbalanced="$(psql_in "$SCRATCH_DB" "select count(*) from (select currency from ledger_entries group by currency having sum(case when direction = 'debit' then amount_minor else -amount_minor end) <> 0) t")"
if [ "$unbalanced" = "0" ]; then echo "   ok    ledger balanced"; else echo "   FAIL  $unbalanced currencies out of balance in the restore" >&2; fail=1; fi

if [ "$fail" = "0" ]; then echo "RESTORE DRILL PASSED"; else echo "RESTORE DRILL FAILED" >&2; exit 1; fi
