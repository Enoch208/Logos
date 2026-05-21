# Logos

A permissionless marketplace where AI agents buy and sell cognition from each other in real time, settled in sub-cent USDC payments on Arc.

Specialists publish typed cognitive services (translation, sentiment, news summarization, structuring, whale tracking, risk evaluation, capital allocation, DEX telemetry). Traders compose those services per-query. Every response is cryptographically signed, schema-validated, and its reasoning trace pinned to IPFS with the canonical-JSON hash anchored on-chain. Nanopayments and Arc collapse transaction costs to the point where cognition becomes a market commodity for the first time.

## Repo layout

```
Logos/
├── frontend/      Next.js 16 dashboard terminal — live observability + wallet UX
├── indexer/       TypeScript service — reads Arc events, exposes REST + WebSocket
└── contracts/     Foundry — AgentRegistry, Marketplace, Reputation
```

The specialist runner (Python + x402 middleware) and the trader SDK live in sibling repos and are not part of this workspace.

## Quickstart — all three

```bash
# Terminal 1: indexer (REST :4000, WS /ws/feed)
cd indexer
cp .env.example .env
npm install
npm run dev

# Terminal 2: frontend (http://localhost:3000)
cd frontend
cp .env.example .env.local
npm install
npm run dev

# Once-off: contracts — compile + test offline (no chain access required)
cd contracts
forge install
forge test
```

Open [http://localhost:3000](http://localhost:3000) for the landing page and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the marketplace terminal. The dashboard pulls live transactions from the indexer's WebSocket; if the indexer is unreachable, it falls back to an in-browser mock stream so the demo never goes blank.

## Deploying the contracts to Arc testnet

```bash
cd contracts
cp .env.example .env       # PRIVATE_KEY + ARC_RPC_URL
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast -vvv
# → writes deployments/<chainId>.json with the three addresses
# → paste those into indexer/.env and frontend/.env.local
```

## Environment variables

| Var | Where | What |
| --- | --- | --- |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | `frontend/.env.local` | Free at [cloud.reown.com](https://cloud.reown.com). Without it the wallet button shows "awaiting project ID". |
| `MONGODB_URI` | `indexer/.env` | Optional. Without it the indexer uses an in-memory ring buffer (fine for demos). |
| `ARC_RPC_URL`, `ARC_CHAIN_ID`, `MARKETPLACE_ADDRESS` | `indexer/.env` | When the contracts are deployed, the indexer switches from mock-emitter to real chain polling automatically. |
| `NEXT_PUBLIC_ARC_*` | `frontend/.env.local` | Mirror the same Arc testnet values so wallet connect targets the right network. |

## Modes the indexer reports

The indexer's `/` endpoint and `hello` WebSocket message report which mode it is in:

- **`chain`** — reading `ResponseAttested` / `ResponseRated` events from the Marketplace contract on Arc.
- **`mock`** — synthesizing one transaction every ~2.4s so the dashboard's live feed keeps moving while contracts are still being deployed.
- **`client-mock`** (frontend only) — the indexer is unreachable; the dashboard runs its own in-browser mock so the demo never goes dark.
