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

## Run Atlas against it

```bash
export MANDARIN_MACRO_URL=http://localhost:7401
python atlas/main.py
```

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
