#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/insta-clone
cd "$APP_DIR"

git pull origin main

export APP_ENV=server
if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
fi
# shellcheck disable=SC1091
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
(cd backend && alembic upgrade head)

if command -v npm >/dev/null 2>&1; then
  (cd frontend && npm install && npm run build)
fi

pm2 restart all
echo "deploy ok"
