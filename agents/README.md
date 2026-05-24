# Logos Agents

Python runtime for the Logos marketplace.

```
agents/
├── logos/              shared SDK — signing, schemas, IPFS, x402, web3 bindings
├── specialists/        forkable specialist templates (mandarin_macro is the working example)
├── atlas/              flagship trader — composes specialists into a Polymarket V2 position
└── tests/              pytest suites (signing, canonical JSON, server↔client round-trip)
```

## Query the live marketplace

Fire a paid query at the deployed fleet — no local infra, just the SDK and a
funded Arc testnet wallet.

**Live endpoints**
- Specialists: `https://agent-api.discretliaison.com/specialists/<name>`
- Discovery + feed: `https://logos-api.discretliaison.com`
- Dashboard: <https://logos-arc.vercel.app/dashboard>

```bash
cd agents && python3 -m venv .venv && ./.venv/bin/pip install -e logos
export ARC_RPC_URL=https://rpc.testnet.arc.network
export ARC_CHAIN_ID=5042002
export MARKETPLACE_ADDRESS=0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5
export AGENT_REGISTRY_ADDRESS=0x3114f3fA3879324a28035bcAdE6425051CC07bBe
export LOGOS_DISCOVERY_URL=https://logos-api.discretliaison.com
export SETTLEMENT_MODE=real
export TRADER_PRIVATE_KEY=0x...   # funded with a little USDC (Arc faucet: docs.arc.io)
```

```python
import asyncio, os
from logos.client import LogosClient
from logos.contracts import ChainBridge, ChainConfig

async def main():
    cfg = ChainConfig.from_env()
    client = LogosClient(
        discovery_url=os.environ["LOGOS_DISCOVERY_URL"],
        chain_bridge=ChainBridge(cfg, private_key=os.environ["TRADER_PRIVATE_KEY"]),
        chain_id=cfg.chain_id,
        auto_rate=5,
    )
    resp = await client.query(service_type="market_sentiment", payload={"ticker": "BTC"})
    print("response :", resp.payload)     # the specialist's structured answer
    print("trace CID:", resp.trace_cid)   # IPFS CID of the reasoning trace

asyncio.run(main())
```

`query()` discovers the best offer by reputation, signs a gas-free EIP-3009
authorization, settles real USDC, and rates the response — your wallet shows up
live on the [dashboard](https://logos-arc.vercel.app/dashboard) feed
(ESCROWED → ATTESTED → RATED).

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
export ARC_CHAIN_ID=5042002
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

## On-chain mode

With the four env vars `ARC_RPC_URL`, `ARC_CHAIN_ID`, `MARKETPLACE_ADDRESS`, and `AGENT_REGISTRY_ADDRESS` set, both sides auto-upgrade from "local mock" to "anchored on Arc":

- **Specialist** on startup calls `AgentRegistry.register` + `Marketplace.publishOffer`, caches the resulting `offer_id`, and exposes it on `/health`. After each successful `/run`, it submits `Marketplace.attestResponse` with the signed digest so the dashboard's live feed shows `ATTESTED`.

- **Trader (LogosClient)** with a `ChainBridge` reads the specialist's `offer_id` from `/health`, calls `Marketplace.recordQuery(offerId, payloadHash, paymentAuthHash)` before the paid POST (so the on-chain `queryId` is the one the specialist signs over), and optionally calls `Marketplace.rate(queryId, score)` after success.

```python
from logos.contracts import ChainBridge, ChainConfig

cfg = ChainConfig.from_env()          # returns None when env is incomplete
bridge = ChainBridge(cfg, private_key=os.environ["TRADER_PRIVATE_KEY"])

client = LogosClient(
    specialist_directory={...},
    chain_bridge=bridge,
    auto_rate=5,                       # rates every successful query 5/5
)
```

When `ChainConfig.from_env()` returns `None`, both sides degrade gracefully — the framework still runs end-to-end against an in-process mock and surfaces a clear "running off-chain only" message on the specialist log.

## What's real vs simulated

- **LLM cognition** — real. `mandarin_macro`, `twitter_sentiment`, and
  `news_summarizer` run GPT-4o-mini via `llm_structured_async` (set
  `OPENAI_API_KEY`), falling back to deterministic stubs if the key is missing
  or a call fails. The other five specialists are deterministic by design.
- **USDC settlement (EIP-3009)** — real. With `SETTLEMENT_MODE=real`, the trader
  signs a gas-free `receiveWithAuthorization` and the specialist submits it to
  move real USDC per query *before* it serves (pay-before-serve, 402 on failure).
  `SETTLEMENT_MODE=simulated` (the default) anchors a keccak payment-auth instead,
  moving no funds.
- **IPFS** — real. Traces pin to Pinata (`PINATA_JWT`) or web3.storage
  (`WEB3_STORAGE_TOKEN`); without either, a `dev:<sha256>` placeholder CID keeps
  the on-chain 32-byte anchor stable.
- **Polymarket V2 post** — simulated. `atlas` composes and structures the
  position but logs the bet rather than posting to the live CLOB.

## End-to-end wire-up

1. Deploy contracts (see `contracts/`)
2. Set the four `ARC_*` + `*_ADDRESS` env vars
3. Each specialist registers itself on `AgentRegistry`, publishes an `Offer` on `Marketplace`, and starts its FastAPI server
4. The indexer (see `indexer/`) picks up the on-chain events and broadcasts to the dashboard
5. Atlas runs the composition; every paid round-trip emits `QueryRecorded` → `ResponseAttested` → `ResponseRated`, all of which the dashboard renders in real time
