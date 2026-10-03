---
name: run-fabrmatch
description: Start Fabrmatch locally (Colima/Docker services, .env, migrations + demo seed, AdonisJS dev server on :3333) and drive it in a real browser with demo logins. Use when asked to run, start, open or screenshot the app, or to confirm a change works in the real app.
---

# Run Fabrmatch locally

macOS, Apple Silicon. Services run in Docker through **Colima** (no Docker Desktop). Homebrew
binaries live in `/opt/homebrew/bin`; put it on `PATH` if `docker`/`colima` are not found.

## 1. Services (Postgres :5433, Redis :6379, MinIO :9000/:9001, Mailpit :1025/:8025)

```bash
export PATH=/opt/homebrew/bin:$PATH
colima status >/dev/null 2>&1 || colima start --cpu 4 --memory 6
docker compose up -d
docker compose ps -a --format "table {{.Service}}\t{{.Status}}"   # minio-init: Exited (0)
```

First time only: `brew install colima docker docker-compose`, and
`~/.docker/config.json` must contain `{"cliPluginsExtraDirs":["/opt/homebrew/lib/docker/cli-plugins"]}`
or `docker compose` is not found.

Gotcha: `quay.io/minio/*` and Docker Hub `minio/*` images are gone (401 / not found).
`docker-compose.yml` uses the drop-in fork `pgsty/minio` + `pgsty/mc`. Don't switch back.
`minio-init` creates the `fabrmatch` bucket; without it every upload fails.

## 2. `.env` (only if missing)

```bash
cp .env.example .env
sed -i '' 's/^SMTP_HOST=$/SMTP_HOST=localhost/; s/^SMTP_PORT=$/SMTP_PORT=1025/; s/^EMAIL_VERIFICATION_REQUIRED=true/EMAIL_VERIFICATION_REQUIRED=false/; s/^ADMIN_2FA_REQUIRED=true/ADMIN_2FA_REQUIRED=false/' .env
node ace generate:key
git checkout .env.example   # generate:key also rewrites .env.example (drops the trailing newline)
```

## 3. Database

Fresh DB, or after the seeder or migrations changed:

```bash
node ace migration:fresh --seed   # wipes the local DB; demo seeder is not idempotent
```

Otherwise use `node ace migration:run`. Both seeders must print `completed`; an `error` line
means the demo seeder drifted from a service rule (e.g. a shipping precondition). Fix the seeder.

## 4. Dev server

Run it in the background (HMR + SSR) and wait for it:

```bash
npm run dev > <scratchpad>/dev.log 2>&1        # run_in_background; create <scratchpad> first
for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/ | grep -q 200 && break; sleep 1; done
```

Background jobs (matching after payment, offer expiry, e-mails) need the queue worker too:

```bash
node ace queue:work > <scratchpad>/worker.log 2>&1   # run_in_background
```

Without it a paid order stays `paid`. A demo order can also stop at the fraud check (buyer and
seller on the same IP): clear it in `/admin/queues` → "Looks fine", then match in `/admin/matching`.

## 5. Drive it

```bash
npx playwright install chromium   # first time only
node .claude/skills/run-fabrmatch/smoke.mjs <outDir> [email] [password] [/path-after-login]
```

Keep driver scripts out of the repo root (Vite reloads the page when a file appears there):
put them in the scratchpad and import Playwright by absolute path,
`import { chromium } from '<repo>/node_modules/playwright/index.mjs'`.
Login is limited to 10 tries / 15 min per IP; between many runs clear it with
`docker compose exec -T redis sh -c "redis-cli --scan --pattern 'rlflx:*' | xargs -r redis-cli del"`.

It screenshots `home.png` and `after-login.png` into `<outDir>` and prints the URL after login
plus any page errors. **Look at the screenshots.** A blank or template-looking page is a failure.

Demo logins:

| Role | Email | Password | Lands on |
|---|---|---|---|
| Admin | admin@fabrmatch.com | admin12345 | /admin |
| Seller | seller@demo.test | password123 | /seller |
| Buyer | buyer@demo.test | password123 | |
| Maker | maker@demo.test | password123 | |

Other UIs: Mailpit http://localhost:8025 · MinIO console http://localhost:9001 (minioadmin / minioadmin).

## Stop

```bash
docker compose stop && colima stop
```
