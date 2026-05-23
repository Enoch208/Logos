"""EIP-3009 ReceiveWithAuthorization settlement for Arc-native USDC.

Real settlement mode: the trader signs an EIP-712 ReceiveWithAuthorization the
specialist (the payee) submits on-chain via USDC.receiveWithAuthorization,
moving real USDC trader -> specialist. Pure functions here — the on-chain
submit lives in ChainBridge. A domain-separator preflight fails loud if the
EIP-712 domain ever drifts from the deployed USDC.
"""
from __future__ import annotations

import base64
import json
import os
import secrets
import time
from typing import Any

from eth_abi import encode as abi_encode
from eth_account import Account
from eth_account.messages import encode_typed_data
from eth_utils import keccak, to_checksum_address

USDC_ADDRESS = to_checksum_address(
    os.environ.get("USDC_ADDRESS", "0x3600000000000000000000000000000000000000")
)

_ARC_TESTNET_CHAIN_ID = 5042002
_ARC_TESTNET_DOMAIN_SEPARATOR = (
    "0x361191522483d32a83e70ae7183b4b9629442c13a78bc9921d6f707911c8c6b0"
)

_TYPES = {
    "ReceiveWithAuthorization": [
        {"name": "from", "type": "address"},
        {"name": "to", "type": "address"},
        {"name": "value", "type": "uint256"},
        {"name": "validAfter", "type": "uint256"},
        {"name": "validBefore", "type": "uint256"},
        {"name": "nonce", "type": "bytes32"},
    ]
}


class SettlementError(Exception):
    """Raised when an authorization is malformed, invalid, or unverifiable."""


def _domain(chain_id: int, usdc: str) -> dict[str, Any]:
    return {
        "name": "USDC",
        "version": "2",
        "chainId": chain_id,
        "verifyingContract": to_checksum_address(usdc),
    }


def domain_separator(chain_id: int, usdc: str = USDC_ADDRESS) -> str:
    type_hash = keccak(
        text="EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    )
    return "0x" + keccak(
        abi_encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [type_hash, keccak(text="USDC"), keccak(text="2"), chain_id, to_checksum_address(usdc)],
        )
    ).hex()


def _nonce_bytes(nonce: Any) -> bytes:
    if isinstance(nonce, (bytes, bytearray)):
        return bytes(nonce)
    raw = nonce[2:] if nonce.startswith("0x") else nonce
    return bytes.fromhex(raw)


def _signable(message: dict[str, Any], chain_id: int, usdc: str):
    body = {
        "from": to_checksum_address(message["from"]),
        "to": to_checksum_address(message["to"]),
        "value": int(message["value"]),
        "validAfter": int(message["validAfter"]),
        "validBefore": int(message["validBefore"]),
        "nonce": _nonce_bytes(message["nonce"]),
    }
    return encode_typed_data(
        domain_data=_domain(chain_id, usdc), message_types=_TYPES, message_data=body
    )


def sign_receive_authorization(
    private_key: Any,
    *,
    to: str,
    value: int,
    chain_id: int,
    valid_secs: int = 300,
    usdc: str = USDC_ADDRESS,
) -> dict[str, Any]:
    acct = Account.from_key(private_key)
    now = int(time.time())
    message = {
        "from": acct.address,
        "to": to_checksum_address(to),
        "value": int(value),
        "validAfter": 0,
        "validBefore": now + valid_secs,
        "nonce": "0x" + secrets.token_hex(32),
    }
    signed = Account.sign_message(_signable(message, chain_id, usdc), private_key)
    return {**message, "v": signed.v, "r": "0x%064x" % signed.r, "s": "0x%064x" % signed.s}


def verify_authorization(
    auth: dict[str, Any],
    *,
    expected_payee: str,
    min_value: int,
    chain_id: int,
    usdc: str = USDC_ADDRESS,
) -> str:
    now = int(time.time())
    try:
        if int(auth["validBefore"]) <= now:
            raise SettlementError("authorization expired")
        if int(auth["validAfter"]) > now:
            raise SettlementError("authorization not yet valid")
        if to_checksum_address(auth["to"]) != to_checksum_address(expected_payee):
            raise SettlementError("payee mismatch")
        if int(auth["value"]) < int(min_value):
            raise SettlementError("value below price")
        signable = _signable(auth, chain_id, usdc)
        v = int(auth["v"])
        r = int(auth["r"], 16) if isinstance(auth["r"], str) else int(auth["r"])
        s = int(auth["s"], 16) if isinstance(auth["s"], str) else int(auth["s"])
        recovered = Account.recover_message(signable, vrs=(v, r, s))
    except SettlementError:
        raise
    except Exception as e:  # noqa: BLE001 — any malformed field is a bad auth
        raise SettlementError(f"malformed authorization: {e}") from e
    if to_checksum_address(recovered) != to_checksum_address(auth["from"]):
        raise SettlementError("signature does not match `from`")
    return recovered


def encode_header(auth: dict[str, Any]) -> str:
    return base64.b64encode(json.dumps(auth, separators=(",", ":")).encode()).decode()


def decode_header(value: str) -> dict[str, Any]:
    try:
        return json.loads(base64.b64decode(value).decode())
    except Exception as e:  # noqa: BLE001
        raise SettlementError(f"undecodable payment header: {e}") from e


# Preflight: only assert for the canonical Arc USDC address (tests may override
# USDC_ADDRESS for a mock token). Fails loud before any signature is produced.
if USDC_ADDRESS == to_checksum_address("0x3600000000000000000000000000000000000000"):
    if domain_separator(_ARC_TESTNET_CHAIN_ID) != _ARC_TESTNET_DOMAIN_SEPARATOR:
        raise RuntimeError(
            "Arc USDC EIP-712 domain separator mismatch — EIP-3009 signatures "
            "would be rejected on-chain"
        )
