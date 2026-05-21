#!/usr/bin/env bash
# One-shot VPS bootstrap: pulls the repo, installs deps, builds, and brings
# up the indexer + fleet under PM2. Idempotent — safe to re-run.
#
# The frontend lives on Vercel; only the backend services run here.
#
# Assumes:
#   - Ubuntu/Debian
#   - Node 22+ + npm available (install via nvm or nodesource if not)
#   - Python 3.11+ available (install via deadsnakes or pyenv if not)
#   - PM2 installed globally: `npm i -g pm2`
#   - cloudflared installed + tunnel already configured (the user provides
#     ~/.cloudflared/config.yml — see deploy/cloudflared.example.yml)

set -euo pipefail

REPO_DIR="${LOGOS_DIR:-$HOME/Logos}"

if [ ! -d "$REPO_DIR" ]; then
    echo "❌ Repo not found at $REPO_DIR — clone it first or set LOGOS_DIR."
    exit 1
fi

cd "$REPO_DIR"

echo "▸ pull latest"
git pull --ff-only

echo "▸ make sure env files are in place"
for f in indexer/.env agents/.env; do
    if [ ! -f "$f" ]; then
        echo "❌ Missing $f — copy from the .example next to it and fill in values."
        exit 1
    fi
done

echo "▸ indexer: install + build"
(cd indexer && npm ci && npm run build)

echo "▸ agents: venv + logos editable install"
cd agents
if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -e ./logos
if [ ! -x ./.venv/bin/python ]; then
    echo "❌ agents/.venv/bin/python missing after install — bail" >&2
    exit 1
fi
echo "   agents/.venv/bin/python OK ($(./.venv/bin/python --version))"
cd "$REPO_DIR"

echo "▸ logs dir"
mkdir -p logs

echo "▸ restart PM2 stack"
if pm2 describe logos-indexer > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production
else
    pm2 start ecosystem.config.cjs --env production
fi
pm2 save

echo ""
echo "✅ Backend up under PM2. Tail logs with:"
echo "     pm2 logs                       # both at once"
echo "     pm2 logs logos-indexer         # just the indexer"
echo "     pm2 logs logos-fleet           # just the fleet"
echo ""
echo "Frontend is on Vercel — make sure its env points at:"
echo "     NEXT_PUBLIC_API_URL = https://api.logos.<yourdomain>"
echo "     NEXT_PUBLIC_WS_URL  = wss://api.logos.<yourdomain>/ws/feed"
