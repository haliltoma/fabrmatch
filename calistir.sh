#!/usr/bin/env bash
# Fabrmatch yerel geliştirme — tek komutla yönetim
#
# Kullanım:
#   ./calistir.sh start    [servis]   # hepsi (redis dahil) veya tek servis
#   ./calistir.sh stop     [servis]   # app servislerini durdur (redis KALIR)
#   ./calistir.sh down                # app servisleri + redis
#   ./calistir.sh restart  [servis]
#   ./calistir.sh status              # tüm servislerin durumu + sağlık
#   ./calistir.sh logs <servis> [-f]  # log izle (sistemA, sistemB, kuyruk, geometri, vitrin)
#
# Servisler: redis | sistemA | sistemB | kuyruk | geometri | vitrin
# Loglar: .logs/<servis>.log — PID dosyaları: .logs/pids/
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
PID_DIR="$LOG_DIR/pids"
mkdir -p "$PID_DIR"

ALL_SERVICES="redis sistemA sistemB kuyruk geometri vitrin"

port_of() {
  case "$1" in
    sistemA) echo 9000 ;;
    sistemB) echo 3333 ;;
    geometri) echo 8000 ;;
    vitrin) echo 4321 ;;
    *) echo "" ;;
  esac
}

url_of() {
  case "$1" in
    sistemA) echo "http://localhost:9000/health" ;;
    sistemB) echo "http://localhost:3333/" ;;
    geometri) echo "http://127.0.0.1:8000/health" ;;
    vitrin) echo "http://localhost:4321/" ;;
  esac
}

is_running() {
  local pid_file="$PID_DIR/$1.pid"
  [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

start_bg() {
  local name="$1" dir="$2"
  shift 2
  if is_running "$name"; then
    echo "  $name: zaten çalışıyor (pid $(cat "$PID_DIR/$name.pid"))"
    return 0
  fi
  ( cd "$ROOT/$dir" && exec "$@" ) >>"$LOG_DIR/$name.log" 2>&1 &
  echo $! >"$PID_DIR/$name.pid"
  echo "  $name: başlatıldı (pid $(cat "$PID_DIR/$name.pid"), log: .logs/$name.log)"
}

# TERM'i önce çocuklara gönder, port hâlâ doluysa oradaki süreci de kapat
stop_app() {
  local name="$1"
  local port
  port="$(port_of "$name")"
  local stopped=0

  if is_running "$name"; then
    local pid
    pid="$(cat "$PID_DIR/$name.pid")"
    pkill -TERM -P "$pid" 2>/dev/null
    kill -TERM "$pid" 2>/dev/null
    stopped=1
    rm -f "$PID_DIR/$name.pid"
  fi
  if [ -n "$port" ]; then
    local port_pids
    port_pids="$(lsof -ti ":$port" 2>/dev/null || true)"
    if [ -n "$port_pids" ]; then
      echo "$port_pids" | xargs kill -TERM 2>/dev/null
      stopped=1
    fi
  fi

  sleep 2
  # inatçı kalanları zorla kapat
  if [ -n "$port" ]; then
    lsof -ti ":$port" 2>/dev/null | xargs kill -9 2>/dev/null
  fi
  if [ "$name" = "kuyruk" ] && pgrep -f "ace queue:work" >/dev/null 2>&1; then
    pkill -f "ace queue:work" 2>/dev/null
    stopped=1
  fi

  if [ "$stopped" = "1" ]; then
    echo "  $name: durduruldu"
  else
    echo "  $name: zaten durmuyor"
  fi
}

health_code() {
  curl -s -o /dev/null -m 3 -w "%{http_code}" "$1" 2>/dev/null
}

do_start() {
  local target="${1:-hepsi}"
  if [ "$target" = "hepsi" ] || [ "$target" = "redis" ]; then
    if docker compose -f "$ROOT/docker-compose.yml" up -d redis >/dev/null 2>&1; then
      echo "  redis: çalışıyor (docker)"
    else
      echo "  redis: docker compose başlatılamadı (docker açık mı?)"
    fi
    [ "$target" = "redis" ] && return 0
  fi
  if [ "$target" = "hepsi" ] || [ "$target" = "sistemA" ]; then
    start_bg sistemA "apps/store/packages/api" npm run dev
    [ "$target" = "sistemA" ] && return 0
  fi
  if [ "$target" = "hepsi" ] || [ "$target" = "sistemB" ]; then
    start_bg sistemB "apps/manufacturer-network" node ace serve --hmr
    [ "$target" = "sistemB" ] && return 0
  fi
  if [ "$target" = "hepsi" ] || [ "$target" = "kuyruk" ]; then
    start_bg kuyruk "apps/manufacturer-network" node ace queue:work
    [ "$target" = "kuyruk" ] && return 0
  fi
  if [ "$target" = "hepsi" ] || [ "$target" = "geometri" ]; then
    start_bg geometri "services/geometry" uv run fastapi dev src/fabrmatch_geometry/main.py
    [ "$target" = "geometri" ] && return 0
  fi
  if [ "$target" = "hepsi" ] || [ "$target" = "vitrin" ]; then
    start_bg vitrin "apps/storefront" npm run dev
    return 0
  fi
  echo "Bilinmeyen servis: $target (geçerli: $ALL_SERVICES)"
  return 1
}

do_stop() {
  local target="${1:-hepsi}"
  for s in vitrin geometri kuyruk sistemB sistemA; do
    if [ "$target" = "hepsi" ] || [ "$target" = "$s" ]; then
      stop_app "$s"
    fi
  done
  if [ "$target" = "down" ]; then
    docker compose -f "$ROOT/docker-compose.yml" stop redis >/dev/null 2>&1
    echo "  redis: durduruldu (docker)"
  elif [ "$target" = "redis" ]; then
    docker compose -f "$ROOT/docker-compose.yml" stop redis >/dev/null 2>&1
    echo "  redis: durduruldu (docker)"
  else
    echo "  redis: çalışmaya devam ediyor ('./calistir.sh down' ile durdur)"
  fi
}

do_status() {
  for s in $ALL_SERVICES; do
    if [ "$s" = "redis" ]; then
      if docker compose -f "$ROOT/docker-compose.yml" ps --status running redis 2>/dev/null | grep -q redis; then
        echo "  redis     : çalışıyor (docker)"
      else
        echo "  redis     : DURMUYOR"
      fi
      continue
    fi
    local line="  $(printf '%-9s' "$s")"
    local alive=0
    if is_running "$s"; then
      alive=1
    elif [ -n "$(port_of "$s")" ] && [ -n "$(lsof -ti ":$(port_of "$s")" 2>/dev/null)" ]; then
      alive=1
    elif [ "$s" = "kuyruk" ] && pgrep -f "ace queue:work" >/dev/null 2>&1; then
      alive=1
    fi
    if [ "$alive" = "1" ]; then
      line+="çalışıyor"
    else
      line+="DURMUYOR"
    fi
    local code
    code="$(health_code "$(url_of "$s")")"
    if [ -n "$code" ] && [ "$code" != "000" ]; then
      line+="  (http $code, port $(port_of "$s"))"
    elif [ -n "$(port_of "$s")" ]; then
      line+="  (yanıt yok, port $(port_of "$s"))"
    else
      line+="  (port yok — kuyruk işçisi)"
    fi
    echo "$line"
  done
}

do_logs() {
  local name="${1:-}"
  local follow="${2:-}"
  if [ -z "$name" ]; then
    echo "Kullanım: ./calistir.sh logs <servis> [-f]  (servisler: $ALL_SERVICES)"
    return 1
  fi
  local tail_args=(-n 40)
  [ "$follow" = "-f" ] && tail_args=(-f)
  tail "${tail_args[@]}" "$LOG_DIR/$name.log"
}

case "${1:-}" in
  start)   do_start "${2:-hepsi}" ;;
  stop)    do_stop "${2:-hepsi}" ;;
  down)    do_stop down ;;
  restart) do_stop "${2:-hepsi}"; echo; do_start "${2:-hepsi}" ;;
  status)  do_status ;;
  logs)    shift; do_logs "$@" ;;
  *)       sed -n '2,14p' "$0" | sed 's/^# \{0,2\}//' ;;
esac
