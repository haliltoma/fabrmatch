#!/usr/bin/env bash
# Fabrmatch deploy: git pull → data services → build → migrations → services → health check.
# Safe to re-run for every release. Usage: bash deploy/deploy.sh [--skip-pull] [--no-backup] [--help]
# Runbook: docs/DEPLOY.md

set -uo pipefail

# ─── settings ────────────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${FABRMATCH_ENV_FILE:-$HOME/.config/fabrmatch/app.env}"
STATE_DIR="$HOME/.local/state/fabrmatch"
BACKUP_DIR="$HOME/backups/fabrmatch"
COMPOSE_FILE="$APP_DIR/deploy/docker-compose.prod.yml"
KEEP_BACKUPS=10
HEALTH_TIMEOUT=60

SKIP_PULL=0
NO_BACKUP=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
    --no-backup) NO_BACKUP=1 ;;
    -h | --help)
      sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (see --help)"
      exit 2
      ;;
  esac
done

# docker group membership only reaches new login sessions: re-run under it when needed
if ! docker info >/dev/null 2>&1 && id -nG "$USER" | grep -qw docker && [ -z "${FABRMATCH_SG:-}" ]; then
  export FABRMATCH_SG=1
  exec sg docker -c "$(printf '%q ' bash "$0" "$@")"
fi

# nvm is not loaded in non-interactive shells
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null
fi

mkdir -p "$STATE_DIR/logs"
RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
LOG_FILE="$STATE_DIR/logs/deploy-$RUN_ID.log"
DURATIONS_FILE="$STATE_DIR/step-durations"
touch "$DURATIONS_FILE"
ls -1t "$STATE_DIR"/logs/deploy-*.log 2>/dev/null | tail -n +21 | xargs -r rm -f

# ─── output helpers ──────────────────────────────────────────────────────────
if [ -t 1 ]; then
  B=$'\e[1m' D=$'\e[2m' R=$'\e[31m' G=$'\e[32m' Y=$'\e[33m' C=$'\e[36m' N=$'\e[0m'
  TTY=1
else
  B='' D='' R='' G='' Y='' C='' N=''
  TTY=0
fi

fmt_time() { printf '%dm%02ds' $(($1 / 60)) $(($1 % 60)); }
info() { printf '      %s\n' "$*" | tee -a "$LOG_FILE"; }
warn() { printf '      %s⚠ %s%s\n' "$Y" "$*" "$N" | tee -a "$LOG_FILE"; WARNINGS+=("$*"); }

# step keys, titles, first-run estimates in seconds (later runs use the measured durations)
STEPS=(preflight pull services deps build prod_deps backup migrate storage units health)
declare -A TITLE=(
  [preflight]='Ön kontroller (araçlar, env, docker)'
  [pull]='Kod güncelleme (git pull)'
  [services]='Veri servisleri (Postgres, Redis, S3, Mail)'
  [deps]='Bağımlılıklar (npm ci)'
  [build]='Derleme (node ace build)'
  [prod_deps]='Üretim bağımlılıkları (build/npm ci)'
  [backup]='Veritabanı yedeği (pg_dump)'
  [migrate]='Migration (node ace migration:run)'
  [storage]='Dosya deposu (bucket + CORS)'
  [units]='Servisler (systemd: web + worker)'
  [health]='Sağlık kontrolü'
)
declare -A ESTIMATE=(
  [preflight]=3 [pull]=5 [services]=15 [deps]=60 [build]=90 [prod_deps]=40
  [backup]=5 [migrate]=15 [storage]=5 [units]=5 [health]=15
)
declare -A HINT=(
  [preflight]='Eksik araç/ayar yukarıda yazıyor. İlk kurulum: sudo bash deploy/setup-root.sh $USER, env: docs/DEPLOY.md'
  [pull]='Sunucudaki değişiklikleri commit edip pushla ya da --skip-pull ile çalıştır. git stash KULLANMA: deploy.sh de geri alınır. Ağ/yetki: ssh -T git@github.com'
  [services]='docker compose -f deploy/docker-compose.prod.yml --env-file ~/.config/fabrmatch/app.env ps / logs <servis>. Port çakışması: ss -tlnp'
  [deps]='package-lock.json ile package.json uyumsuz olabilir; yerelde npm install yapıp lock dosyasını commit et. Ağ: npm ping'
  [build]='TypeScript/Vite hatası: yerelde npm run typecheck ve node ace build ile aynı hatayı al, düzelt, tekrar pushla'
  [prod_deps]='build/package-lock.json eksik/bozuk olabilir; build adımını tekrar çalıştır'
  [backup]='Postgres container çalışıyor mu: docker ps. Disk dolu mu: df -h ~. Yedeği atlamak için --no-backup (önerilmez)'
  [migrate]='Hatalı migration: önce yerelde node ace migration:run ile dene. Geri dönmek için az önceki yedek: pg_restore (docs/DEPLOY.md)'
  [storage]='S3 erişimi: S3_ENDPOINT/S3_KEY/S3_SECRET doğru mu, docker logs fabrmatch-prod-s3-1'
  [units]='systemctl --user status fabrmatch-web; linger kapalıysa: sudo loginctl enable-linger $USER'
  [health]='journalctl --user -u fabrmatch-web -n 100 --no-pager ; journalctl --user -u fabrmatch-worker -n 100 --no-pager'
)

estimate() {
  local v
  v="$(awk -v k="$1" '$1 == k { print $2 }' "$DURATIONS_FILE")"
  echo "${v:-${ESTIMATE[$1]}}"
}
remember_duration() {
  local tmp
  tmp="$(mktemp)"
  awk -v k="$1" '$1 != k' "$DURATIONS_FILE" >"$tmp"
  echo "$1 $2" >>"$tmp"
  mv "$tmp" "$DURATIONS_FILE"
}
remaining_after() {
  local total=0 seen=0 s
  for s in "${STEPS[@]}"; do
    [ "$seen" = 1 ] && total=$((total + $(estimate "$s")))
    [ "$s" = "$1" ] && seen=1
  done
  echo "$total"
}
progress_bar() {
  local done=$1 total=$2 width=30 filled
  filled=$((done * width / total))
  local bar='' i
  for ((i = 0; i < width; i++)); do
    if [ "$i" -lt "$filled" ]; then bar+='█'; else bar+='░'; fi
  done
  printf '%s' "$bar"
}

# ─── step runner ─────────────────────────────────────────────────────────────
TOTAL=${#STEPS[@]}
INDEX=0
DEPLOY_START=$(date +%s)
WARNINGS=()
CURRENT_CMD=''
STEP_LOG=''

fail() {
  local step=$1 code=$2 elapsed=$3
  [ "$TTY" = 1 ] && printf '\r\e[K'
  echo
  echo "${R}${B}✖ DEPLOY BAŞARISIZ — aşama $INDEX/$TOTAL: ${TITLE[$step]}${N}"
  echo "${R}──────────────────────────────────────────────────────────────────────${N}"
  echo "  ${B}Aşama   :${N} $step  (${TITLE[$step]})"
  echo "  ${B}Komut   :${N} ${CURRENT_CMD:-—}"
  echo "  ${B}Çıkış   :${N} $code   ${B}Süre:${N} $(fmt_time "$elapsed")"
  echo "  ${B}Tam log :${N} $LOG_FILE"
  echo
  local clean errors
  clean="$(sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' "$STEP_LOG")"
  # the lines that name the problem (tsc, npm, node, docker, pg), not the build's asset listing
  errors="$(grep -E 'error|Error|ERR!|ERROR|TS[0-9]{4}|✖|[Ff]ailed|FATAL|denied|refused|not found|Cannot|Eksik|Boş|yok|çalışmıyor|vermedi' <<<"$clean" |
    grep -vE '^public/assets/|server_error|field_error' | head -n 20)"
  if [ -n "$errors" ]; then
    echo "  ${R}${B}Tespit edilen hata satırları:${N}"
    sed "s/^/  ${R}▶${N} /" <<<"$errors"
    echo
  fi
  echo "  ${B}Son çıktı (son 25 satır):${N}"
  tail -n 25 <<<"$clean" | sed "s/^/  ${D}│${N} /"
  echo
  echo "  ${Y}${B}Ne yapmalı:${N} ${HINT[$step]}"
  [ -n "${EXTRA_HINT:-}" ] && echo "  ${Y}$EXTRA_HINT${N}"
  echo "${R}──────────────────────────────────────────────────────────────────────${N}"
  on_failure_cleanup "$step"
  exit "$code"
}

# runs a command inside the current step: output → step log (+ full log); spinner on a TTY
run() {
  CURRENT_CMD="$*"
  echo "\$ $*" >>"$STEP_LOG"
  if [ "$TTY" = 1 ]; then
    ("$@") >>"$STEP_LOG" 2>&1 &
    local pid=$! frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' i=0 started=$STEP_START
    while kill -0 "$pid" 2>/dev/null; do
      local now=$(($(date +%s) - started))
      local last
      last="$(tail -n 1 "$STEP_LOG" 2>/dev/null | tr -d '\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | cut -c1-60)"
      printf '\r\e[K      %s %s %s%s%s' "${frames:i++%10:1}" "$(fmt_time "$now")" "$D" "$last" "$N"
      sleep 0.2
    done
    wait "$pid"
    local code=$?
    printf '\r\e[K'
    return $code
  else
    "$@" >>"$STEP_LOG" 2>&1
  fi
}

step() {
  local key=$1
  INDEX=$((INDEX + 1))
  STEP_START=$(date +%s)
  STEP_LOG="$(mktemp)"
  EXTRA_HINT=''
  CURRENT_CMD=''
  local remaining
  remaining=$(($(estimate "$key") + $(remaining_after "$key")))
  echo
  printf '%s[%2d/%d]%s %s %s%3d%%%s  %s%s%s  %s~%s kaldı%s\n' \
    "$C$B" "$INDEX" "$TOTAL" "$N" "$(progress_bar $((INDEX - 1)) "$TOTAL")" "$D" $(((INDEX - 1) * 100 / TOTAL)) "$N" \
    "$B" "${TITLE[$key]}" "$N" "$D" "$(fmt_time "$remaining")" "$N"
  echo "==== [$INDEX/$TOTAL] $key: ${TITLE[$key]} ($(date '+%F %T'))" >>"$LOG_FILE"

  "step_$key"
  local code=$?
  local elapsed=$(($(date +%s) - STEP_START))
  cat "$STEP_LOG" >>"$LOG_FILE"
  if [ "$code" -ne 0 ]; then
    fail "$key" "$code" "$elapsed"
  fi
  remember_duration "$key" "$elapsed"
  printf '      %s✔ tamam%s %s(%s)%s\n' "$G" "$N" "$D" "$(fmt_time "$elapsed")" "$N"
  rm -f "$STEP_LOG"
}

skip() { printf '      %s↷ atlandı: %s%s\n' "$D" "$*" "$N"; }

load_env() {
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}
env_value() { (load_env >/dev/null 2>&1 && eval "printf '%s' \"\${$1:-}\""); }

# ─── rollback of the build directory ─────────────────────────────────────────
BUILD_BACKED_UP=0
SERVICES_RESTARTED=0
on_failure_cleanup() {
  local step=$1
  case "$step" in
    build | prod_deps)
      if [ "$BUILD_BACKED_UP" = 1 ] && [ -d "$APP_DIR/build.prev" ]; then
        rm -rf "$APP_DIR/build" && mv "$APP_DIR/build.prev" "$APP_DIR/build"
        echo "  ${G}↺ Önceki build geri yüklendi; çalışan site etkilenmedi.${N}"
      fi
      ;;
    health)
      if [ "$SERVICES_RESTARTED" = 1 ] && [ -d "$APP_DIR/build.prev" ]; then
        echo "  ${Y}↺ Önceki build'e dönülüyor…${N}"
        rm -rf "$APP_DIR/build.failed" && mv "$APP_DIR/build" "$APP_DIR/build.failed" &&
          mv "$APP_DIR/build.prev" "$APP_DIR/build" &&
          systemctl --user restart fabrmatch-web fabrmatch-worker &&
          echo "  ${G}↺ Önceki sürüm yeniden başlatıldı. Hatalı build: build.failed/${N}"
        echo "  ${Y}Not: migration'lar geri alınmadı; gerekirse yedekten dön (docs/DEPLOY.md).${N}"
      fi
      ;;
  esac
}

# ─── steps ───────────────────────────────────────────────────────────────────
step_preflight() {
  CURRENT_CMD='araç kontrolü (git node npm docker curl systemctl)'
  local missing=()
  for tool in git node npm docker curl systemctl; do
    command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Eksik araç(lar): ${missing[*]}" >>"$STEP_LOG"
    EXTRA_HINT="Kurulu olmayan: ${missing[*]}"
    return 1
  fi
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$node_major" -lt 24 ]; then
    echo "Node $node_major bulundu, 24+ gerekli" >>"$STEP_LOG"
    EXTRA_HINT="nvm install 24 && nvm alias default 24"
    return 1
  fi
  info "node $(node -v), npm $(npm -v), $(docker --version | cut -d, -f1)"

  CURRENT_CMD='docker info'
  if ! docker info >/dev/null 2>&1; then
    echo "docker daemon'a erişilemiyor (kullanıcı docker grubunda değil ya da servis kapalı)" >>"$STEP_LOG"
    EXTRA_HINT="sudo bash deploy/setup-root.sh $USER ; sonra oturumu kapatıp aç"
    return 1
  fi

  CURRENT_CMD="env doğrulama ($ENV_FILE)"
  if [ ! -f "$ENV_FILE" ]; then
    echo "Env dosyası yok: $ENV_FILE" >>"$STEP_LOG"
    EXTRA_HINT="Şablon: .env.example → $ENV_FILE (chmod 600), docs/DEPLOY.md"
    return 1
  fi
  if ! (load_env) >>"$STEP_LOG" 2>&1; then
    echo "Env dosyası okunamadı (boşluk içeren değerleri tırnakla)" >>"$STEP_LOG"
    return 1
  fi
  local perms
  perms="$(stat -c %a "$ENV_FILE")"
  [ "$perms" != 600 ] && warn "$ENV_FILE izinleri $perms (600 olmalı): chmod 600 $ENV_FILE"

  local empty=()
  for var in NODE_ENV APP_KEY APP_URL PORT HOST DB_HOST DB_PORT DB_USER DB_PASSWORD DB_DATABASE \
    REDIS_HOST REDIS_PORT S3_KEY S3_SECRET S3_BUCKET S3_REGION; do
    [ -z "$(env_value "$var")" ] && empty+=("$var")
  done
  if [ ${#empty[@]} -gt 0 ]; then
    echo "Boş/eksik env değişkenleri: ${empty[*]}" >>"$STEP_LOG"
    EXTRA_HINT="$ENV_FILE içinde doldur: ${empty[*]}"
    return 1
  fi
  if grep -nE '^[A-Z_]+=.*FILL_ME' "$ENV_FILE" | cut -d= -f1 >>"$STEP_LOG"; then
    EXTRA_HINT="$ENV_FILE içinde FILL_ME kalan satırları doldur (yukarıda)"
    return 1
  fi
  info "env: $ENV_FILE  (NODE_ENV=$(env_value NODE_ENV), STAGING=$(env_value STAGING))"

  [ "$(loginctl show-user "$USER" -p Linger --value 2>/dev/null)" = yes ] ||
    warn "linger kapalı: oturum kapanınca servisler durur → sudo loginctl enable-linger $USER"
  local free_gb
  free_gb="$(df -BG --output=avail "$APP_DIR" | tail -1 | tr -dc 0-9)"
  [ "$free_gb" -lt 3 ] && warn "diskte yalnız ${free_gb}G boş alan var"
  return 0
}

step_pull() {
  if [ "$SKIP_PULL" = 1 ]; then
    skip "--skip-pull"
    return 0
  fi
  cd "$APP_DIR" || return 1
  CURRENT_CMD='git status --porcelain'
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "Commit edilmemiş değişiklikler var, git pull yapılmadı:" >>"$STEP_LOG"
    git status --short --untracked-files=no >>"$STEP_LOG"
    return 1
  fi
  local branch before after
  branch="$(git rev-parse --abbrev-ref HEAD)"
  before="$(git rev-parse --short HEAD)"
  if ! git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
    warn "'$branch' dalının upstream'i yok; pull atlandı (git branch -u origin/$branch)"
    return 0
  fi
  run git fetch --prune || return 1
  run git pull --ff-only || {
    EXTRA_HINT="Sunucu ile GitHub ayrışmış (ikisinde de farklı commit var): git log --oneline --graph HEAD @{u} -15 ile bak; çözüm: git pull --rebase, sonra git push"
    return 1
  }
  after="$(git rev-parse --short HEAD)"
  if [ "$before" = "$after" ]; then
    info "$branch zaten güncel ($after)"
  else
    info "$branch: $before → $after"
    git log --oneline "$before..$after" | head -10 | sed 's/^/        • /'
  fi
}

step_services() {
  local profile=()
  [ "$(env_value STAGING)" = true ] && profile=(--profile staging)
  [ ${#profile[@]} -gt 0 ] && info "STAGING: S3 (RustFS) + Mailpit da açılıyor"
  run docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "${profile[@]}" up -d --wait --remove-orphans || return 1
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "${profile[@]}" ps --format '{{.Service}}: {{.Status}}' 2>/dev/null |
    sed 's/^/      • /'
}

step_deps() {
  cd "$APP_DIR" || return 1
  run npm ci --no-audit --no-fund
}

step_build() {
  cd "$APP_DIR" || return 1
  if [ -d build ]; then
    rm -rf build.prev
    run cp -a build build.prev || return 1
    BUILD_BACKED_UP=1
    info "önceki build yedeklendi → build.prev/"
  fi
  run node ace build || return 1
  for f in bin/server.js ace.js resources/content public/assets; do
    if [ ! -e "build/$f" ]; then
      echo "Build çıktısında eksik: build/$f" >>"$STEP_LOG"
      EXTRA_HINT="adonisrc.ts metaFiles listesini kontrol et"
      return 1
    fi
  done
}

step_prod_deps() {
  cd "$APP_DIR/build" || return 1
  run npm ci --omit=dev --no-audit --no-fund
}

step_backup() {
  if [ "$NO_BACKUP" = 1 ]; then
    skip "--no-backup"
    return 0
  fi
  local container user db file
  container="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q postgres)"
  user="$(env_value DB_USER)"
  db="$(env_value DB_DATABASE)"
  mkdir -p "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
  file="$BACKUP_DIR/$db-$RUN_ID.dump"
  CURRENT_CMD="docker exec <postgres> pg_dump -U $user -Fc $db > $file"
  if ! docker exec "$container" pg_dump -U "$user" -Fc "$db" >"$file" 2>>"$STEP_LOG"; then
    rm -f "$file"
    return 1
  fi
  chmod 600 "$file"
  ls -1t "$BACKUP_DIR"/"$db"-*.dump 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
  info "yedek: $file ($(du -h "$file" | cut -f1)); son $KEEP_BACKUPS yedek tutulur"
}

step_migrate() {
  cd "$APP_DIR/build" || return 1
  load_env
  run node ace migration:run --force || return 1
  grep -E 'migrated|Already up to date' "$STEP_LOG" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/^[^a-zA-Z]*/      • /' | tail -15
}

step_storage() {
  if [ "$(env_value STAGING)" != true ]; then
    skip "STAGING değil (R2 bucket/CORS Cloudflare panelinden yönetilir)"
    return 0
  fi
  cd "$APP_DIR/build" || return 1
  load_env
  # signed browser uploads come from APP_URL (plus the Tailscale fallback, when serving)
  local origins="$APP_URL"
  local ts
  ts="$(tailscale serve status 2>/dev/null | grep -oE 'https://[a-z0-9.-]+\.ts\.net' | head -1)"
  [ -n "$ts" ] && origins="$origins,$ts"
  export CORS_ORIGINS="$origins"
  run node --input-type=module -e "
    import { S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3'
    const c = new S3Client({ region: process.env.S3_REGION, endpoint: process.env.S3_ENDPOINT, forcePathStyle: true,
      credentials: { accessKeyId: process.env.S3_KEY, secretAccessKey: process.env.S3_SECRET } })
    const Bucket = process.env.S3_BUCKET
    try { await c.send(new HeadBucketCommand({ Bucket })) } catch { await c.send(new CreateBucketCommand({ Bucket })); console.log('bucket created') }
    await c.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: [{
      AllowedOrigins: process.env.CORS_ORIGINS.split(','), AllowedMethods: ['GET', 'PUT'], AllowedHeaders: ['*'], MaxAgeSeconds: 3600 }] } }))
    console.log('cors ok')
  " || return 1
  info "bucket '$S3_BUCKET' hazır, CORS: $origins"
}

step_units() {
  local unit_dir="$HOME/.config/systemd/user" node_bin
  node_bin="$(command -v node)"
  mkdir -p "$unit_dir"
  for tpl in "$APP_DIR"/deploy/systemd/*.service; do
    sed -e "s#@APP_DIR@#$APP_DIR#g" -e "s#@NODE_BIN@#$node_bin#g" "$tpl" >"$unit_dir/$(basename "$tpl")"
  done
  info "node: $node_bin"
  run systemctl --user daemon-reload || return 1
  run systemctl --user enable fabrmatch-web fabrmatch-worker || return 1
  run systemctl --user restart fabrmatch-web fabrmatch-worker || return 1
  SERVICES_RESTARTED=1
}

step_health() {
  local port url code waited=0
  port="$(env_value PORT)"
  url="http://127.0.0.1:$port/"
  CURRENT_CMD="curl $url (en fazla ${HEALTH_TIMEOUT}s)"
  while :; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url")"
    [ "$code" = 200 ] && break
    if [ "$waited" -ge "$HEALTH_TIMEOUT" ]; then
      echo "Web ${HEALTH_TIMEOUT}s içinde 200 vermedi (son kod: $code)" >>"$STEP_LOG"
      journalctl --user -u fabrmatch-web -n 40 --no-pager -o cat >>"$STEP_LOG" 2>&1
      return 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
  info "web: $url → 200 (${waited}s)"

  sleep 2
  for unit in fabrmatch-web fabrmatch-worker; do
    if ! systemctl --user is-active --quiet "$unit"; then
      echo "$unit çalışmıyor:" >>"$STEP_LOG"
      journalctl --user -u "$unit" -n 40 --no-pager -o cat >>"$STEP_LOG" 2>&1
      CURRENT_CMD="systemctl --user is-active $unit"
      return 1
    fi
  done
  info "servisler: fabrmatch-web ✔  fabrmatch-worker ✔"

  local app_url public
  app_url="$(env_value APP_URL)"
  public="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$app_url/")"
  if [ "$public" = 200 ]; then
    info "dış erişim: $app_url → 200"
  else
    warn "dış erişim: $app_url → $public (tünel/DNS: systemctl status cloudflared, tailscale serve status)"
  fi
  systemctl is-active --quiet cloudflared 2>/dev/null || warn "cloudflared servisi çalışmıyor"
  rm -rf "$APP_DIR/build.failed"
  return 0
}

# ─── main ────────────────────────────────────────────────────────────────────
cd "$APP_DIR" || exit 1
exec 9>"$STATE_DIR/deploy.lock"
if ! flock -n 9; then
  echo "${R}Başka bir deploy çalışıyor (kilit: $STATE_DIR/deploy.lock).${N}"
  exit 1
fi

echo "${B}Fabrmatch deploy${N}  ${D}$(git rev-parse --abbrev-ref HEAD 2>/dev/null)@$(git rev-parse --short HEAD 2>/dev/null) · $(date '+%F %T') · log: $LOG_FILE${N}"
trap 'printf "\r\e[K\n%sİptal edildi (aşama %s/%s). Log: %s%s\n" "$R" "$INDEX" "$TOTAL" "$LOG_FILE" "$N"; exit 130' INT TERM

for s in "${STEPS[@]}"; do step "$s"; done

TOTAL_TIME=$(($(date +%s) - DEPLOY_START))
echo
echo "${G}${B}✔ DEPLOY TAMAM${N}  $(progress_bar "$TOTAL" "$TOTAL") 100%  ${D}toplam $(fmt_time "$TOTAL_TIME")${N}"
echo "  sürüm : $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"
echo "  adres : $(env_value APP_URL)"
echo "  log   : $LOG_FILE"
if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "  ${Y}${B}Uyarılar (${#WARNINGS[@]}):${N}"
  for w in "${WARNINGS[@]}"; do echo "   ${Y}• $w${N}"; done
fi
