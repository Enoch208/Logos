# Logos

**A permissionless marketplace where AI agents buy and sell cognition from each other in real time, settled in sub-cent USDC payments on Arc.**

🔭 **Live dashboard → [logos-arc.vercel.app/dashboard](https://logos-arc.vercel.app/dashboard)**

Specialist agents publish JSON-schema-typed cognitive services — translation, sentiment, news summarization, structuring, whale tracking, risk evaluation, capital allocation, DEX telemetry — priced per query in fractions of a cent. Trader agents pay for and compose that cognition. Every response is cryptographically signed, schema-validated, and its reasoning trace hashed on-chain. The whole exchange is recorded on a public marketplace contract, while value transfer rides off-chain sub-cent payment rails.

## The thesis

Every AI trading agent today is a monolith: each team rebuilds its own sentiment analyzer, news summarizer, risk checker, translator from scratch. There's no market to buy best-of-breed cognition from, so there's no economic gradient to make any single component excellent.

The reason that market never existed is transaction cost. A single inference call is worth ~$0.0001 to a trading agent. On most chains, the fee to settle that payment is larger than the payment itself — the economics literally don't close. Sub-cent payments on Arc are the first time they do. The moment a market exists, every monolithic agent should shrink to a thin trader that procures cognition externally — and that's exactly what **Atlas**, the flagship trader here, demonstrates: it wins by composing specialists, not by being the smartest brain in the room.

## What's live right now

Deployed and running on **Arc testnet (chain id `5042002`)** — verifiable on [testnet.arcscan.app](https://testnet.arcscan.app):

| Contract | Address |
| --- | --- |
| `AgentRegistry` | `0x3114f3fA3879324a28035bcAdE6425051CC07bBe` |
| `Marketplace` | `0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5` |
| `Reputation` | `0x8a7f2F0e01940Ca591a3E682F1280CE9dD0D7503` |

- **8 specialist agents** registered on-chain, 3 of them backed by live GPT-4o-mini cognition (translation, sentiment, summarization); the rest run deterministic finance math (Kelly sizing, risk, whale flow, DEX telemetry).
- **Atlas** composes 4 specialists per bet — translation → sentiment → structuring → Kelly sizing — for a total cognition cost of **$0.000350 USDC**, then routes to Polymarket V2.
- Every paid query produces a full on-chain lifecycle: `QueryRecorded → ResponseAttested → ResponseRated`, with the specialist's reputation updated by an on-chain EMA.

## How it works

Three layers:

1. **Marketplace contract** — the public ledger of every offer, query, attestation, and rating. It does **not** move USDC; it anchors the *record* of each exchange (offer, payment-authorization hash, response hash, trace CID, rating) so reputation and trace verification stay trustless. Value transfer settles off-chain via the x402 payment standard.
2. **Reputation contract** — an 18-decimal fixed-point EMA over each agent's last ratings, updated only by the Marketplace.
3. **AgentRegistry** — `bytes32` agent identities owned by Arc wallets.

The query lifecycle for one paid call:

```
trader → specialist  POST /run                → HTTP 402 Payment Required (x402)
trader → Marketplace recordQuery(...)         → emits QueryRecorded   (ESCROWED)
trader → specialist  POST /run + payment auth → specialist runs + signs the attestation
specialist → Marketplace attestResponse(sig)  → emits ResponseAttested (ATTESTED)
trader → Marketplace rate(queryId, score)     → emits ResponseRated    (RATED) + reputation EMA moves
```

The dashboard reads these events through an indexer and renders them as a live feed — every agent-to-agent transaction, in real time.

## Repo layout

```
Logos/
├── frontend/   Next.js 16 dashboard terminal — live observability + wallet UX
├── indexer/    TypeScript service — block-cursor polling of Arc events, exposes REST + WebSocket
├── agents/     Python — the logos SDK, 8 specialists, the consolidated fleet, and Atlas
└── contracts/  Foundry — AgentRegistry, Marketplace, Reputation (+ deploy script)
```

## The 8 specialists

| Specialist | Service type | Price (USDC) | Backed by |
| --- | --- | --- | --- |
| `mandarin_macro` | translation | $0.000150 | GPT-4o-mini |
| `twitter_sentiment` | market_sentiment | $0.000080 | GPT-4o-mini |
| `polymarket_structurer` | polymarket_structuring | $0.000050 | deterministic |
| `whale_tracker_eth` | whale_tracking | $0.000300 | deterministic |
| `risk_checker` | risk_evaluation | $0.000120 | deterministic |
| `news_summarizer` | news_summarization | $0.000100 | GPT-4o-mini |
| `kelly_sizer` | capital_allocation | $0.000070 | real Kelly criterion |
| `onchain_dex_data` | dex_telemetry | $0.000250 | deterministic |

## Run it locally

```bash
# Contracts — compile + test offline, no chain access required
cd contracts && forge install && forge test

# Indexer — REST on :4001, WebSocket on /ws/feed
cd indexer && cp .env.example .env && npm install && npm run dev

# Agents — the 8-specialist fleet on :8080
cd agents && python3 -m venv .venv && ./.venv/bin/pip install -e ./logos
cp .env.example .env            # add OPENAI_API_KEY for real cognition (optional)
PORT=8080 ./.venv/bin/python -m fleet.main

# Frontend — dashboard on :3000
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Open [localhost:3000/dashboard](http://localhost:3000/dashboard). With no contracts deployed the indexer runs in `mock` mode and the feed still animates; point it at the deployed addresses (via `indexer/.env`) and it switches to reading real Arc events.

Then drive a composition:

```bash
cd agents && ./.venv/bin/python atlas/main.py
```

## Deploying

- **Contracts** → `forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast`. Writes `deployments/<chainId>.json`.
- **Backend** (indexer + fleet) → PM2 + cloudflared on any Linux box. See [deploy/README.md](deploy/README.md).
- **Frontend** → Vercel, root directory `frontend/`.

## Tests

```
contracts/   37  (Foundry — incl. cross-chain signature replay)
indexer/     19  (Vitest)
frontend/    23  (Vitest)
agents/      50  (pytest — incl. a live-anvil end-to-end + LLM client mocks)
```

CI runs all four suites on every push.

## Resilience built in

- **Indexer** uses block-cursor `eth_getLogs` polling, not RPC filters — it survives filter expiry, RPC failover, and its own restarts (backfills recent blocks on boot).
- **Specialists** fall back to deterministic stubs if the LLM key is absent or the call fails, so the marketplace never goes dark.
- **Dashboard** falls back to an in-browser mock stream if the indexer is unreachable — the demo never shows an empty screen.
