"""web3.py bindings to the Logos contract surface.

The Marketplace anchors don't move USDC — they record what happened so the
indexer and reputation system stay verifiable. This module is what makes the
Python agents actually emit on-chain events.

Public surface:
- MARKETPLACE_ABI / REGISTRY_ABI — minimal ABIs (the contracts package
  ships the full ones)
- ChainConfig — env-loadable connection details
- ChainBridge — thin wrapper that handles tx building / signing / sending,
  no provider auto-detection magic, no retries; if it fails, it fails loud
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract
from web3.middleware import ExtraDataToPOAMiddleware


MARKETPLACE_ABI: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "publishOffer",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "agentId", "type": "bytes32"},
            {"name": "serviceTypeHash", "type": "bytes32"},
            {"name": "schemaHash", "type": "bytes32"},
            {"name": "pricePerQuery", "type": "uint256"},
            {"name": "endpointURL", "type": "string"},
        ],
        "outputs": [{"name": "offerId", "type": "bytes32"}],
    },
    {
        "type": "function",
        "name": "recordQuery",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "offerId", "type": "bytes32"},
            {"name": "queryPayloadHash", "type": "bytes32"},
            {"name": "paymentAuthHash", "type": "bytes32"},
        ],
        "outputs": [{"name": "queryId", "type": "bytes32"}],
    },
    {
        "type": "function",
        "name": "attestResponse",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "queryId", "type": "bytes32"},
            {"name": "responseHash", "type": "bytes32"},
            {"name": "traceCID", "type": "bytes32"},
            {"name": "sig", "type": "bytes"},
        ],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "rate",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "queryId", "type": "bytes32"},
            {"name": "score", "type": "uint8"},
        ],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "deactivateOffer",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "offerId", "type": "bytes32"}],
        "outputs": [],
    },
    {
        "type": "event",
        "name": "QueryRecorded",
        "anonymous": False,
        "inputs": [
            {"name": "queryId", "type": "bytes32", "indexed": True},
            {"name": "offerId", "type": "bytes32", "indexed": True},
            {"name": "trader", "type": "address", "indexed": True},
            {"name": "paymentAuthHash", "type": "bytes32", "indexed": False},
        ],
    },
    {
        "type": "event",
        "name": "OfferPublished",
        "anonymous": False,
        "inputs": [
            {"name": "offerId", "type": "bytes32", "indexed": True},
            {"name": "agentId", "type": "bytes32", "indexed": True},
            {"name": "serviceTypeHash", "type": "bytes32", "indexed": True},
            {"name": "pricePerQuery", "type": "uint256", "indexed": False},
            {"name": "endpointURL", "type": "string", "indexed": False},
        ],
    },
]

REGISTRY_ABI: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "register",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "agentId", "type": "bytes32"},
            {"name": "metadataURI", "type": "string"},
        ],
        "outputs": [],
    },
]

USDC_ABI: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "receiveWithAuthorization",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "validAfter", "type": "uint256"},
            {"name": "validBefore", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"},
            {"name": "v", "type": "uint8"},
            {"name": "r", "type": "bytes32"},
            {"name": "s", "type": "bytes32"},
        ],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "balanceOf",
        "stateMutability": "view",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]


@dataclass(frozen=True)
class ChainConfig:
    rpc_url: str
    chain_id: int
    marketplace: str
    registry: str
    usdc: str = "0x3600000000000000000000000000000000000000"

    @classmethod
    def from_env(cls) -> "ChainConfig | None":
        """Returns a ChainConfig if the four required env vars are set,
        otherwise None — callers use this to no-op gracefully when running
        in pure mock mode."""
        try:
            return cls(
                rpc_url=os.environ["ARC_RPC_URL"],
                chain_id=int(os.environ["ARC_CHAIN_ID"]),
                marketplace=os.environ["MARKETPLACE_ADDRESS"],
                registry=os.environ["AGENT_REGISTRY_ADDRESS"],
                usdc=os.environ.get(
                    "USDC_ADDRESS", "0x3600000000000000000000000000000000000000"
                ),
            )
        except KeyError:
            return None


def make_web3(cfg: ChainConfig) -> Web3:
    w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    # L2s often emit > 32 bytes of extraData; the POA middleware lets web3
    # parse those block headers without raising.
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


def _to_bytes32(value: str | bytes) -> bytes:
    if isinstance(value, bytes):
        if len(value) != 32:
            raise ValueError(f"expected 32-byte input, got {len(value)}")
        return value
    raw = value[2:] if value.startswith("0x") else value
    return bytes.fromhex(raw.rjust(64, "0"))


def _hex0x(value: str | bytes) -> str:
    """web3.py 7.x's HexBytes.hex() drops the 0x prefix in some versions
    and keeps it in others. Normalise so callers always get 0x-prefixed."""
    if isinstance(value, bytes):
        return "0x" + value.hex()
    return value if value.startswith("0x") else "0x" + value


class ChainBridge:
    """Tiny wrapper around web3 + a hot private key for the four writes the
    agents need: register, publishOffer, recordQuery, attestResponse, rate.

    Read methods come back as plain Python — no callers depend on Contract
    instances leaking out. Failures are loud (Web3.eth.send_raw_transaction
    raises on revert by default when wait_for_receipt is used)."""

    def __init__(self, cfg: ChainConfig, private_key: str):
        self.cfg = cfg
        self.w3 = make_web3(cfg)
        self.account = Account.from_key(private_key)
        self.marketplace: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(cfg.marketplace),
            abi=MARKETPLACE_ABI,
        )
        self.registry: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(cfg.registry),
            abi=REGISTRY_ABI,
        )
        self.usdc: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(cfg.usdc),
            abi=USDC_ABI,
        )

    # ─── writes ──────────────────────────────────────────────────────────

    def register_agent(self, agent_id: str, metadata_uri: str) -> str:
        return self._send(
            self.registry.functions.register(_to_bytes32(agent_id), metadata_uri)
        )

    def publish_offer(
        self,
        agent_id: str,
        service_type_hash: str,
        schema_hash: str,
        price_per_query: int,
        endpoint_url: str,
    ) -> str:
        return self._send(
            self.marketplace.functions.publishOffer(
                _to_bytes32(agent_id),
                _to_bytes32(service_type_hash),
                _to_bytes32(schema_hash),
                int(price_per_query),
                endpoint_url,
            )
        )

    def record_query(
        self, offer_id: str, query_payload_hash: str, payment_auth_hash: str
    ) -> tuple[str, str]:
        """Returns (tx_hash, query_id). queryId is recovered from the
        QueryRecorded event emitted by the contract, not from the function
        return value (non-view returns aren't accessible to off-chain
        callers in EVM)."""
        receipt = self._send_receipt(
            self.marketplace.functions.recordQuery(
                _to_bytes32(offer_id),
                _to_bytes32(query_payload_hash),
                _to_bytes32(payment_auth_hash),
            )
        )
        events = self.marketplace.events.QueryRecorded().process_receipt(receipt)
        if not events:
            raise RuntimeError("QueryRecorded event not found in receipt")
        query_id_bytes = events[0]["args"]["queryId"]
        return _hex0x(receipt["transactionHash"]), _hex0x(query_id_bytes)

    def attest_response(
        self, query_id: str, response_hash: str, trace_cid: str, signature: str
    ) -> str:
        sig_bytes = bytes.fromhex(signature[2:] if signature.startswith("0x") else signature)
        return self._send(
            self.marketplace.functions.attestResponse(
                _to_bytes32(query_id),
                _to_bytes32(response_hash),
                _to_bytes32(trace_cid),
                sig_bytes,
            )
        )

    def rate(self, query_id: str, score: int) -> str:
        if not 1 <= score <= 5:
            raise ValueError(f"score must be 1..5, got {score}")
        return self._send(
            self.marketplace.functions.rate(_to_bytes32(query_id), int(score))
        )

    def deactivate_offer(self, offer_id: str) -> str:
        """Owner-gated: flips an offer inactive so it drops out of discovery.
        Used by the health monitor to auto-deactivate a specialist that has
        failed N consecutive liveness checks (FR-10)."""
        return self._send(
            self.marketplace.functions.deactivateOffer(_to_bytes32(offer_id))
        )

    def submit_receive_with_authorization(self, auth: dict[str, Any]) -> str:
        """Submits a trader-signed EIP-3009 ReceiveWithAuthorization, moving
        real USDC from `auth['from']` to `auth['to']`. msg.sender (this hot
        key) must equal `auth['to']` — i.e. the specialist is the payee."""
        return self._send(
            self.usdc.functions.receiveWithAuthorization(
                Web3.to_checksum_address(auth["from"]),
                Web3.to_checksum_address(auth["to"]),
                int(auth["value"]),
                int(auth["validAfter"]),
                int(auth["validBefore"]),
                _to_bytes32(auth["nonce"]),
                int(auth["v"]),
                _to_bytes32(auth["r"]),
                _to_bytes32(auth["s"]),
            )
        )

    def usdc_balance_of(self, address: str) -> int:
        return int(
            self.usdc.functions.balanceOf(Web3.to_checksum_address(address)).call()
        )

    # ─── internal ────────────────────────────────────────────────────────

    def _send(self, fn) -> str:
        receipt = self._send_receipt(fn)
        return _hex0x(receipt["transactionHash"])

    def _send_receipt(self, fn) -> Any:
        tx = fn.build_transaction(
            {
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "chainId": self.cfg.chain_id,
                "gas": 500_000,
                "maxFeePerGas": self.w3.eth.gas_price * 2,
                "maxPriorityFeePerGas": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] != 1:
            raise RuntimeError(f"tx {tx_hash.hex()} reverted")
        return receipt
