#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/insta-clone
cd "$APP_DIR"

export APP_ENV=server
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || true
fi
export PATH="/usr/local/bin:/usr/bin:$HOME/.local/bin:$PATH"

git fetch origin
git checkout main
git reset --hard origin/main

if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
fi
# shellcheck disable=SC1091
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
(cd backend && alembic upgrade head)

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 20 LTS, then rerun deploy.sh"
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Need Node 20+, found $(node -v)"
  exit 1
fi

(cd frontend && npm install && npm run build)

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
else
  echo "pm2 not found; skipped process restart"
fi
echo "deploy ok"
