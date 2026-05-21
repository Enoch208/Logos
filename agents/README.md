# Logos Agents

Python runtime for the Logos marketplace.

```
agents/
├── logos/              shared SDK — signing, schemas, IPFS, x402, web3 bindings
├── specialists/        forkable specialist templates (mandarin_macro is the working example)
├── atlas/              flagship trader — composes specialists, posts to Polymarket V2
└── tests/              pytest suites (signing, canonical JSON, server↔client round-trip)
```

## Setup

```bash
cd agents
python3 -m venv .venv && source .venv/bin/activate
pip install -e logos[dev]
```

The `-e` flag installs `logos` in editable mode so changes show up without reinstall. Pytest collection runs from `agents/`.

## Run a specialist

```bash
export SPECIALIST_PRIVATE_KEY=0x<throwaway-key>
export SPECIALIST_PAYOUT_ADDRESS=0x<address>
export ARC_CHAIN_ID=421614
export MARKETPLACE_ADDRESS=0x<deployed>

python specialists/mandarin_macro/main.py
# → http://localhost:7401
```

Probe it:

```bash
curl -X POST http://localhost:7401/run \
  -H 'content-type: application/json' \
  -d '{"text_url":"https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html"}'
# → 402, with x402 headers describing the price and recipient

curl -X POST http://localhost:7401/run \
  -H 'content-type: application/json' \
  -H 'X-Payment-Auth: 0xdead' \
  -H "X-402-Query-Id: 0x$(openssl rand -hex 32)" \
  -d '{"text_url":"https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html"}'
# → 200, with a signed AttestedResponse
```

## All 8 specialists at once

```bash
# Each one runs on a dedicated port (7401–7408). Boot them in the background.
for spec in mandarin_macro twitter_sentiment polymarket_structurer whale_tracker_eth \
            risk_checker news_summarizer kelly_sizer onchain_dex_data; do
  python specialists/$spec/main.py &
done
```

| Specialist | Service type | Port | Price (USDC) |
| --- | --- | --- | --- |
| mandarin_macro | translation | 7401 | $0.000150 |
| twitter_sentiment | market_sentiment | 7402 | $0.000080 |
| polymarket_structurer | polymarket_structuring | 7403 | $0.000050 |
| whale_tracker_eth | whale_tracking | 7404 | $0.000300 |
| risk_checker | risk_evaluation | 7405 | $0.000120 |
| news_summarizer | news_summarization | 7406 | $0.000100 |
| kelly_sizer | capital_allocation | 7407 | $0.000070 |
| onchain_dex_data | dex_telemetry | 7408 | $0.000250 |

## Run Atlas against them

```bash
source .env.example   # or set the *_URL vars individually
python atlas/main.py
```

Atlas composes translation → sentiment → structuring → kelly_sizer and logs
the full composition with per-step costs and trace CIDs.

## Tests

```bash
pip install pytest pytest-asyncio
pytest
```

## What's stubbed

- **LLM**: `mandarin_macro._translate` is a deterministic lookup. Swap in an OpenAI / Anthropic call when the LLM key is available.
- **EIP-3009 / Circle Gateway**: the `X-Payment-Auth` header is an opaque keccak token that gets anchored on-chain via `Marketplace.recordQuery`. A future revision replaces it with a real signed authorization that Circle Gateway can settle.
- **IPFS**: with `WEB3_STORAGE_TOKEN` set, traces pin to web3.storage; without one, they get a `dev:<sha256>` placeholder CID so the contract still gets a stable 32-byte anchor.
- **Polymarket V2 post**: `atlas._route_to_polymarket` logs what it would post. A future revision wires the CLOB client.

## Wiring into the rest of the monorepo

1. Deploy contracts (see `contracts/`)
2. Copy `MARKETPLACE_ADDRESS`, `AGENT_REGISTRY_ADDRESS`, `ARC_RPC_URL`, `ARC_CHAIN_ID` into each specialist's env
3. Each specialist registers itself on `AgentRegistry`, publishes an `Offer` on `Marketplace`, and starts its FastAPI server
4. The indexer (see `indexer/`) picks up the on-chain events and broadcasts to the dashboard
5. Atlas runs the composition; every paid round-trip emits `QueryRecorded` → `ResponseAttested` → `ResponseRated`, all of which the dashboard renders in real time
