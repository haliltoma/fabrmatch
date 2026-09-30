#!/usr/bin/env bash
# Build and (re)start Fabrmatch on this server. Safe to re-run for every release.
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="$HOME/.config/fabrmatch/app.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE (see docs/DEPLOY.md)"; exit 1; }

# STAGING=true in the env file also brings up MinIO + Mailpit (test server)
PROFILE=()
grep -q '^STAGING=true' "$ENV_FILE" && PROFILE=(--profile staging)
docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.prod.yml "${PROFILE[@]}" up -d --wait

npm ci
node ace build
(cd build && npm ci --omit=dev)

# migrations need the production env; `set -a` exports every line of the env file
(set -a; . "$ENV_FILE"; set +a; cd build && node ace migration:run --force)

mkdir -p "$HOME/.config/systemd/user"
cp deploy/systemd/*.service "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable fabrmatch-web fabrmatch-worker >/dev/null
systemctl --user restart fabrmatch-web fabrmatch-worker
systemctl --user --no-pager status fabrmatch-web fabrmatch-worker | grep -E "●|Active"
