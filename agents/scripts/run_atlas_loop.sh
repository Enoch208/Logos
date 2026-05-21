#!/usr/bin/env bash
# Runs Atlas in loop mode — fires a composition on an interval so the
# marketplace shows continuous activity for judges. Deliberately NOT in
# ecosystem.config.cjs: it burns gas every cycle, so you opt in explicitly:
#
#   pm2 start agents/scripts/run_atlas_loop.sh --name logos-atlas
#   pm2 logs logos-atlas
#   pm2 delete logos-atlas        # stop the burn
#
# Knobs (env or agents/.env):
#   ATLAS_LOOP_INTERVAL  seconds between compositions (default 600 = 10 min)
#   FLEET_BASE           where the specialists live (default localhost:8080,
#                        i.e. the fleet on the same box — no tunnel round-trip)

set -euo pipefail

AGENTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_PYTHON="$AGENTS_DIR/.venv/bin/python"

if [ ! -x "$VENV_PYTHON" ]; then
    echo "❌ $VENV_PYTHON missing — run deploy/setup.sh first" >&2
    exit 1
fi

cd "$AGENTS_DIR"

if [ -f .env ]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
fi

: "${ATLAS_LOOP_INTERVAL:=600}"
FLEET_BASE="${FLEET_BASE:-http://localhost:8080}"

export ATLAS_LOOP_INTERVAL
export MANDARIN_MACRO_URL="$FLEET_BASE/specialists/mandarin_macro"
export TWITTER_SENTIMENT_URL="$FLEET_BASE/specialists/twitter_sentiment"
export POLYMARKET_STRUCTURER_URL="$FLEET_BASE/specialists/polymarket_structurer"
export KELLY_SIZER_URL="$FLEET_BASE/specialists/kelly_sizer"

echo "[atlas] loop launcher · interval=${ATLAS_LOOP_INTERVAL}s · fleet=${FLEET_BASE}"
exec "$VENV_PYTHON" atlas/main.py
