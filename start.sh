#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Starlink Monitor — startup script
#
# Usage:
#   ./start.sh           Development mode  (backend on :8000, Vite on :5173)
#   ./start.sh --prod    Production mode   (single process on :8000, React
#                                           pre-built and served by FastAPI)
#   ./start.sh --help
#
# Environment variables (optional overrides):
#   DISH_ADDRESS   gRPC target  (default: 192.168.100.1:9200)
#   BACKEND_PORT   FastAPI port (default: 8000)
#   FRONTEND_PORT  Vite port    (default: 5173, dev mode only)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROD=0
for arg in "$@"; do
  case "$arg" in
    --prod)   PROD=1 ;;
    --help|-h)
      sed -n '2,13p' "$0" | sed 's/^# \{0,2\}//'
      exit 0
      ;;
  esac
done

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DISH_ADDRESS="${DISH_ADDRESS:-192.168.100.1:9200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── colour helpers ─────────────────────────────────────────────────────────────
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n'    "$*"; }

# ── detect python ─────────────────────────────────────────────────────────────
PYTHON=""
for cmd in python3 python; do
  if command -v "$cmd" &>/dev/null; then
    ver=$("$cmd" -c 'import sys; print(sys.version_info >= (3,11))' 2>/dev/null)
    if [[ "$ver" == "True" ]]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [[ -z "$PYTHON" ]]; then
  red "ERROR: Python 3.11+ not found. Install it from https://python.org"
  exit 1
fi

# ── detect node / npm (dev mode only) ─────────────────────────────────────────
if [[ "$PROD" -eq 0 ]]; then
  if ! command -v node &>/dev/null; then
    red "ERROR: Node.js not found. Install it from https://nodejs.org"
    exit 1
  fi
  NODE_VER=$(node -e 'process.stdout.write(process.version)')
  echo "  node  : $NODE_VER"
fi

echo ""
bold "┌─ Starlink Monitor ──────────────────────────────────────┐"
if [[ "$PROD" -eq 1 ]]; then
bold "│  Mode      : Production (single process)                │"
else
bold "│  Mode      : Development (two processes)                │"
fi
bold "│  Python    : $("$PYTHON" --version)"
bold "│  Dish      : $DISH_ADDRESS"
bold "└─────────────────────────────────────────────────────────┘"
echo ""

# ── backend setup ─────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR/backend"

yellow "→ Installing backend dependencies…"
"$PYTHON" -m pip install -r requirements.txt -q

# ── production build (if requested) ───────────────────────────────────────────
if [[ "$PROD" -eq 1 ]]; then
  if ! command -v npm &>/dev/null && ! command -v npm.cmd &>/dev/null; then
    red "ERROR: npm not found — needed to build the frontend."
    red "       Install Node.js from https://nodejs.org, run ./start.sh --prod again."
    exit 1
  fi
  yellow "→ Installing frontend dependencies…"
  cd "$SCRIPT_DIR/frontend"
  npm install -q

  yellow "→ Building React app…"
  npm run build

  cd "$SCRIPT_DIR/backend"
  green "✓ Frontend built → backend will serve it as static files"
fi

# ── launch backend ─────────────────────────────────────────────────────────────
SERVE_STATIC_VAL=0
[[ "$PROD" -eq 1 ]] && SERVE_STATIC_VAL=1

yellow "→ Starting backend on http://0.0.0.0:${BACKEND_PORT}…"
DISH_ADDRESS="$DISH_ADDRESS" SERVE_STATIC="$SERVE_STATIC_VAL" \
  "$PYTHON" -m uvicorn main:app \
    --host 0.0.0.0 \
    --port "$BACKEND_PORT" \
    ${PROD:+--workers 2} &
BACKEND_PID=$!

# ── launch frontend dev server (dev mode only) ─────────────────────────────────
FRONTEND_PID=""
if [[ "$PROD" -eq 0 ]]; then
  yellow "→ Starting Vite dev server on http://localhost:${FRONTEND_PORT}…"
  cd "$SCRIPT_DIR/frontend"
  npm install -q
  npm run dev -- --port "$FRONTEND_PORT" &
  FRONTEND_PID=$!
fi

# ── ready message ──────────────────────────────────────────────────────────────
sleep 2
echo ""
green "✓ Starlink Monitor is running"
if [[ "$PROD" -eq 1 ]]; then
  green "  Dashboard → http://localhost:${BACKEND_PORT}"
  green "  API docs  → disabled in production"
else
  green "  Dashboard → http://localhost:${FRONTEND_PORT}"
  green "  API       → http://localhost:${BACKEND_PORT}/docs"
fi
echo ""
yellow "  Press Ctrl+C to stop all processes"
echo ""

# ── cleanup on exit ────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  yellow "Shutting down…"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  kill "$BACKEND_PID"       2>/dev/null || true
  wait 2>/dev/null || true
  green "Stopped."
}
trap cleanup EXIT INT TERM

wait
