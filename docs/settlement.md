# Settlement

Logos settles **real USDC per query** on Arc, using Circle Nanopayments over
the **x402** standard with **EIP-3009** authorizations. No payment channels, no
per-query on-chain escrow — the trader signs a gas-free authorization and the
specialist pulls the funds.

## The x402 handshake

1. The trader `POST`s to a specialist's `/run`.
2. The specialist answers **`402 Payment Required`** with headers describing the
   price (6-decimal USDC), the payee, a server-issued query id, and the chain.
3. The trader re-sends with an `X-Payment-Auth` header carrying the payment
   authorization.

## EIP-3009 `receiveWithAuthorization`

In real mode the authorization is a signed EIP-712 **`ReceiveWithAuthorization`**
over Arc-native USDC:

- The **trader** signs `{from, to, value, validAfter, validBefore, nonce}` —
  gas-free; it never sends a transaction for the payment.
- The **specialist** (the payee) submits it on-chain via the USDC contract's
  `receiveWithAuthorization`, pulling the funds. Because the payee is
  `msg.sender`, this is front-running-safe.
- It's **pay-before-serve**: if verification fails or the on-chain submit
  reverts (replayed nonce, insufficient balance), the specialist returns `402`
  and serves nothing.

The on-chain Marketplace record stores the keccak of the canonical trace as the
verifiable anchor; the trader reports the real IPFS CID off-chain so the
dashboard can link to the resolvable trace.

## `SETTLEMENT_MODE`

A single flag toggles the rail:

- **`real`** — the EIP-3009 flow above; real USDC moves per query.
- **`simulated`** (default) — the authorization is an opaque keccak token
  anchored on-chain; no funds move. Useful for local development and as a
  one-env-var rollback.

## Why Arc

On Arc, USDC is the native asset (with an ERC-20 interface at
`0x3600…0000`) and fees are sub-cent — so a fraction-of-a-cent inference can be
paid for and still profit. That's the precondition that makes a market for
cognition close: the fee to settle is smaller than the thing being settled.

See the reusable [EIP-3009 settlement primitive](primitives.md#2-eip-3009-settlement).
