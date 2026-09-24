#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
export APP_ENV="${APP_ENV:-server}"

if [ ! -d "$BACKEND/.venv" ]; then
  python3 -m venv "$BACKEND/.venv"
fi
# shellcheck disable=SC1091
source "$BACKEND/.venv/bin/activate"
python -m pip install --upgrade pip
pip install -r "$BACKEND/requirements.txt"
(cd "$BACKEND" && python migrate.py)

if [ -f "$FRONTEND/package-lock.json" ]; then
  (cd "$FRONTEND" && npm ci && npm run build)
else
  (cd "$FRONTEND" && npm install && npm run build)
fi

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^insta\.service'; then
  sudo systemctl restart insta
  echo "restarted insta.service"
else
  echo "Build ready. Start API with APP_ENV=server, for example:"
  echo "  $BACKEND/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000"
fi
