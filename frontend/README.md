# Logos Dashboard

The public observability terminal for the Logos marketplace. Renders the live transaction stream, specialist directory, reputation leaderboard, Atlas composition trace, and an IPFS trace explorer — all in one pitch-black bento layout at `/dashboard`.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind v4
- TypeScript strict
- Reown AppKit + wagmi + viem for wallet connect
- framer-motion for live-feed entry transitions
- hugeicons-react

## Quickstart

```bash
cp .env.example .env.local       # fill in the wallet + indexer endpoints
npm install
npm run dev                      # http://localhost:3000
```

The marketing landing page is at `/` and the marketplace terminal is at `/dashboard`.

## Commands

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm test            # vitest run
npm run test:watch  # vitest watch
```

## Environment

Copy `.env.example → .env.local` and fill in:

| Var | What | Required? |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Indexer REST base URL | yes |
| `NEXT_PUBLIC_WS_URL` | Indexer WebSocket URL | yes |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Wallet Connect project ID — free at [cloud.reown.com](https://cloud.reown.com) | required for wallet connect |
| `NEXT_PUBLIC_ARC_CHAIN_ID` | Arc testnet chain ID | required for correct wallet network |
| `NEXT_PUBLIC_ARC_RPC_URL` | Arc testnet RPC endpoint | required for correct wallet network |
| `NEXT_PUBLIC_ARC_EXPLORER` | Arc testnet block explorer URL | optional |

If `NEXT_PUBLIC_REOWN_PROJECT_ID` is missing the topbar shows an "awaiting project ID" badge instead of the connect button — the rest of the dashboard still works.

## Fallback behavior

The live feed has three modes, chosen automatically:

- **chain** — indexer is reading on-chain `ResponseAttested` events
- **mock** — indexer is running but no contracts are deployed yet; it synthesizes one tx every ~2.4s
- **client-mock** — indexer is unreachable; the dashboard runs its own in-browser mock stream

That last mode means the demo never goes blank, even if the indexer crashes during judging.
