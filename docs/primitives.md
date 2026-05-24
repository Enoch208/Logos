# Reusable primitives

Logos is built from a handful of standalone, MIT-licensed primitives. Each is
useful on its own — outside the marketplace — to anyone building paid,
verifiable agent services on Arc. They live in this monorepo today; this page
is the map for reusing them.

---

## 1. x402 paywall

**`agents/logos/src/logos/x402.py`** — the HTTP 402 "Payment Required"
envelope for pay-per-call services. An endpoint answers an unpaid request with
a `402` carrying the price, payee, a server nonce, and the chain; the caller
re-sends with an `X-Payment-Auth` header. Transport-agnostic — drop it in front
of any FastAPI route.

```python
from logos.x402 import PaymentRequired, extract_payment_header

required = PaymentRequired(price_usdc_6=150, recipient=payout, query_id=qid, chain_id=5042002)
# return 402 with required.to_headers() when no payment is present:
if not extract_payment_header(request.headers):
    return Response(status_code=402, headers=required.to_headers())
```

## 2. EIP-3009 settlement

**`agents/logos/src/logos/settlement.py`** — gas-free per-query USDC settlement
on Arc-native USDC via `receiveWithAuthorization`. The payer signs an EIP-712
authorization; the payee submits it. Includes a domain-separator preflight that
fails loud if the EIP-712 domain ever drifts from the deployed token.

```python
from logos.settlement import sign_receive_authorization, verify_authorization

auth = sign_receive_authorization(payer_key, to=payee, value=150, chain_id=5042002)
payer = verify_authorization(auth, expected_payee=payee, min_value=150, chain_id=5042002)
# then submit on-chain via the USDC contract's receiveWithAuthorization(...)
```

## 3. Canonical-JSON attestation

**`agents/logos/src/logos/canonical.py`** + **`signing.py`** — deterministic
JSON serialization → keccak, plus domain-separated EIP-191 signatures bound to
`chainId` + contract address (so a signature can't be replayed across chains or
deployments). Any system that needs verifiable, tamper-evident signed responses
can reuse this.

```python
from logos.signing import sign_attestation, verify_attestation

sig = sign_attestation(private_key=key, chain_id=5042002, marketplace_address=mkt,
                       query_id=qid, response_hash=rhash, trace_cid=anchor)
ok = verify_attestation(signature=sig, expected_signer=addr, chain_id=5042002,
                        marketplace_address=mkt, query_id=qid, response_hash=rhash,
                        trace_cid=anchor)
```

## 4. The `logos` SDK

**`agents/logos/`** — the trader/specialist SDK. `LogosClient.query()` runs the
whole exchange (discover → x402 → sign → settle → verify → rate); `Specialist`
turns any `handle(query)` into a registered, x402-paywalled, attesting service.
See the [agents quickstart](https://github.com/Enoch208/Logos/blob/main/agents/README.md).

## 5. On-chain marketplace contracts

**`contracts/src/`** — Solidity scaffolding for an agent marketplace on Arc:

- `AgentRegistry` — bytes32 agent identity → metadata.
- `Marketplace` — records offers, queries, attestations, and ratings (never
  moves funds; settlement rides the x402/EIP-3009 rail above).
- `Reputation` — on-chain EMA over the last 100 ratings, 18-decimal fixed point.

---

All of the above are **MIT-licensed** (see [LICENSE](https://github.com/Enoch208/Logos/blob/main/LICENSE)) and depend
only on widely-used libraries (`eth-account`, `web3.py`, `viem`, FastAPI,
Foundry). Fork a piece, or compose the whole stack.
