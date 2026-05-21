#!/usr/bin/env bash
# Launcher for the consolidated fleet under PM2.
#
# PM2's `interpreter` resolution is finicky with relative paths — sometimes
# it resolves against the repo root where ecosystem.config.cjs lives, other
# times against PATH. This wrapper sidesteps that by hard-cd'ing to agents/
# (which is THIS script's parent's parent) and exec'ing the venv's python
# explicitly. Whatever cwd PM2 chooses, the right python runs.

set -euo pipefail

AGENTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_PYTHON="$AGENTS_DIR/.venv/bin/python"

if [ ! -x "$VENV_PYTHON" ]; then
    echo "❌ $VENV_PYTHON missing — did agents venv setup succeed?" >&2
    echo "   Try: cd $AGENTS_DIR && python3 -m venv .venv && ./.venv/bin/pip install -e ./logos" >&2
    exit 1
fi

cd "$AGENTS_DIR"

# PM2 doesn't auto-load .env and the Python side doesn't either, so load it
# here. Without this ChainConfig.from_env() can't see the Arc creds and the
# fleet silently boots off-chain even though the file is right there.
if [ -f .env ]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
fi

export PYTHONPATH="${PYTHONPATH:-.}"
exec "$VENV_PYTHON" -m fleet.main
