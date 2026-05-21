# Logos Contracts

Three Solidity contracts that anchor the Logos marketplace on Arc testnet.

| Contract | Role |
| --- | --- |
| `AgentRegistry` | Maps `bytes32 agentId → AgentInfo`. The wallet that registers an agent is its only writer. |
| `Reputation` | 18-decimal fixed-point EMA over per-agent ratings. Only the `Marketplace` contract may write. |
| `Marketplace` | Offers, queries, attestations, ratings. **Anchors the record** of every paid exchange — no USDC moves on-chain. Value transfer rides Circle Nanopayments / x402 off-chain. |

## Toolchain

Foundry. The Solidity compiler used is `solc 0.8.24` with the optimizer (200 runs). OpenZeppelin's `ECDSA` + `MessageHashUtils` are vendored via `forge install`.

## Quickstart

```bash
cd contracts
cp .env.example .env       # fill in PRIVATE_KEY + ARC_RPC_URL when ready
forge install              # pulls forge-std + openzeppelin-contracts
forge build
forge test -vv
```

## Test it

```bash
forge test                 # all suites
forge test -vvv            # with traces
forge coverage             # branch coverage report
forge fmt --check          # formatter check
```

## Deploying to Arc testnet

```bash
export PRIVATE_KEY=0x...               # throwaway, funded from the Arc testnet faucet
export ARC_RPC_URL=https://...
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ARC_RPC_URL \
  --broadcast \
  -vvv
```

After deploy:

1. Addresses are written to `deployments/<chainId>.json`.
2. Copy them into `indexer/.env` (`MARKETPLACE_ADDRESS`, `AGENT_REGISTRY_ADDRESS`, `REPUTATION_ADDRESS`) and `frontend/.env.local`.
3. The indexer auto-detects the chain is reachable and flips from `mock` to `chain` mode on next boot.

## Architecture notes

- **No on-chain USDC.** The Marketplace stores `paymentAuthHash` (keccak of the EIP-3009 authorization) and `pricePerQuery` so the dashboard can show what *should have* been paid, but the actual transfer happens via Circle Gateway off-chain. This is the load-bearing assumption of the Nanopayments model — settlement does not block the on-chain record.
- **Signature scheme.** `attestResponse` verifies `ecrecover` against `keccak256("LOGOS_ATTEST", queryId, responseHash, traceCID)` wrapped as an EIP-191 personal message. The signer must match the agent owner per `AgentRegistry`.
- **EMA math.** `Reputation.updateReputation` does `new = old + α · (sample − old)` with α = 0.01 (`ALPHA_FP18 = 1e16`). Ratings 1–5 map linearly to samples [0, 10] · 1e18, so the dashboard renders `reputationFP18 / 1e17` to show one decimal place.
- **Deploy order.** `AgentRegistry → Reputation → Marketplace(reg, rep) → Reputation.setMarketplace(mkt)`. The one-shot setter on `Reputation` makes Marketplace the sole writer and cannot be reassigned.
