# Logos Indexer

TypeScript service that reads on-chain Marketplace events from Arc testnet and exposes them to the dashboard via REST + WebSocket. Falls back to a mock emitter when chain credentials are not configured, so the dashboard never goes dark during development.

## Quickstart

```bash
cd indexer
cp .env.example .env       # fill in what you have; the rest stays mocked
npm install
npm run dev
```

Server boots on `http://localhost:4000` and broadcasts live transactions over `ws://localhost:4000/ws/feed`.

## Modes

The service auto-detects its mode from env:

- **`chain` mode** — when `ARC_RPC_URL`, `ARC_CHAIN_ID`, and `MARKETPLACE_ADDRESS` are all set. Subscribes to `ResponseAttested` and `ResponseRated` events via viem.
- **`mock` mode** — otherwise. Synthesizes one transaction every ~2.4s so the dashboard's live feed stays animated for demos and judging.

## Persistence

- With `MONGODB_URI` set: lifecycle rows persist to Mongo (collection `transactions`, unique on query ID + status). Distinct on-chain trader-wallet counts are restored from these rows on restart.
- Without it: in-memory only, capped at 200 entries.

## Endpoints

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/health` | liveness + server time |
| GET | `/api/summary` | marketplace KPIs |
| GET | `/api/specialists` | the 8 seed specialists (and any externally registered) |
| GET | `/api/transactions?limit=30` | recent paid queries, newest first |
| GET | `/api/atlas` | Atlas flagship composition trace |
| GET | `/api/leaderboard?metric=earned\|reputation\|queries` | ranked specialists |
| WS  | `/ws/feed` | `hello`, `tx`, `summary` messages |
