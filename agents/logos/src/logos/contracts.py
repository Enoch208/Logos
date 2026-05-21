"""web3.py bindings to the Logos contract surface.

Trader uses this to record queries and submit ratings on-chain. Specialist
uses it to read its offer state and submit attestations. The ABI is the
minimal subset; the full one ships with the contracts package.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from web3 import Web3
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


@dataclass(frozen=True)
class ChainConfig:
    rpc_url: str
    chain_id: int
    marketplace: str
    registry: str

    @classmethod
    def from_env(cls) -> "ChainConfig":
        return cls(
            rpc_url=os.environ["ARC_RPC_URL"],
            chain_id=int(os.environ["ARC_CHAIN_ID"]),
            marketplace=os.environ["MARKETPLACE_ADDRESS"],
            registry=os.environ["AGENT_REGISTRY_ADDRESS"],
        )


def make_web3(cfg: ChainConfig) -> Web3:
    w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    # Arc / L2 chains often need this for the extraData field length.
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3
