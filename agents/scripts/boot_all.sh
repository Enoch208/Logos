#!/usr/bin/env bash
# Boots all 8 specialists in sequence, waiting for each to confirm
# on-chain registration before starting the next.
#
# Why sequential: every specialist registers + publishes its offer at
# startup using the same SPECIALIST_PRIVATE_KEY. Parallel boots would
# all fetch nonce N from the chain and only one tx would land. Stagger
# until each specialist's /health reports on_chain=true, then move on.
#
# Usage (from agents/):
#   source .venv/bin/activate
#   set -a; source .env; set +a
#   scripts/boot_all.sh

set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p /tmp/logos-specialists
PIDFILE=/tmp/logos-specialists/pids

# Kill any prior fleet.
if [ -f "$PIDFILE" ]; then
    while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$PIDFILE"
    rm -f "$PIDFILE"
fi

SPECIALISTS=(
    "mandarin_macro:7401"
    "twitter_sentiment:7402"
    "polymarket_structurer:7403"
    "whale_tracker_eth:7404"
    "risk_checker:7405"
    "news_summarizer:7406"
    "kelly_sizer:7407"
    "onchain_dex_data:7408"
)

wait_for_chain_anchor() {
    local port=$1
    for _ in $(seq 1 30); do
        local body
        body=$(curl -sf "http://localhost:$port/health" 2>/dev/null || true)
        if [ -n "$body" ]; then
            if echo "$body" | grep -q '"on_chain":true'; then
                return 0
            fi
            if echo "$body" | grep -q '"on_chain":false'; then
                # off-chain mode is acceptable when env is incomplete
                return 0
            fi
        fi
        sleep 1
    done
    return 1
}

for entry in "${SPECIALISTS[@]}"; do
    name=${entry%%:*}
    port=${entry##*:}
    echo "[boot] $name → :$port"

    PORT=$port \
    SPECIALIST_ENDPOINT_URL="http://localhost:$port" \
        python "specialists/$name/main.py" \
        > "/tmp/logos-specialists/$name.log" 2>&1 &
    echo $! >> "$PIDFILE"

    if wait_for_chain_anchor "$port"; then
        echo "[boot]   $name ready"
    else
        echo "[boot]   $name FAILED to anchor — check /tmp/logos-specialists/$name.log"
        exit 1
    fi
done

echo ""
echo "[boot] all 8 specialists up · pids in $PIDFILE · logs in /tmp/logos-specialists/"
