#!/usr/bin/env bash
# One-time root setup (run: sudo bash deploy/setup-root.sh <user>).
# Installs Docker for Postgres/Redis and lets the app's user services run without a login session.
set -euo pipefail
APP_USER="${1:-${SUDO_USER:-}}"
[ -n "$APP_USER" ] || { echo "usage: sudo bash deploy/setup-root.sh <user>"; exit 1; }

apt-get update
apt-get install -y docker.io docker-compose-v2
systemctl enable --now docker
usermod -aG docker "$APP_USER"
loginctl enable-linger "$APP_USER"
echo "done: log out and back in (or run 'newgrp docker') so $APP_USER can use docker"
