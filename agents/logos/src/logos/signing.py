"""Attestation signing — must match Marketplace.attestDigest exactly.

The Marketplace contract recovers the signer from:

    digest = keccak256(
        abi.encode(
            "LOGOS_ATTEST_V1",
            block.chainid,
            address(this),
            queryId,
            responseHash,
            traceCID,
        )
    ).toEthSignedMessageHash()

This module replicates that with eth_abi + eth_utils so the specialist's
signature recovers to its registered owner address on-chain.
"""

from __future__ import annotations

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_abi import encode as abi_encode
from eth_utils import keccak, to_bytes, to_hex


def _to_bytes32(value: str | bytes) -> bytes:
    if isinstance(value, bytes):
        if len(value) != 32:
            raise ValueError(f"expected 32 bytes, got {len(value)}")
        return value
    raw = value[2:] if value.startswith("0x") else value
    return bytes.fromhex(raw.rjust(64, "0"))


def attestation_digest(
    *,
    chain_id: int,
    marketplace_address: str,
    query_id: str,
    response_hash: str,
    trace_cid: str,
) -> bytes:
    """Returns the EIP-191 personal-message digest the Marketplace expects."""
    inner = keccak(
        abi_encode(
            ["string", "uint256", "address", "bytes32", "bytes32", "bytes32"],
            [
                "LOGOS_ATTEST_V1",
                chain_id,
                marketplace_address,
                _to_bytes32(query_id),
                _to_bytes32(response_hash),
                _to_bytes32(trace_cid),
            ],
        )
    )
    msg = encode_defunct(primitive=inner)
    # Return the raw 32-byte digest the contract will recover against.
    return keccak(b"\x19Ethereum Signed Message:\n32" + inner), msg


def sign_attestation(
    *,
    private_key: str,
    chain_id: int,
    marketplace_address: str,
    query_id: str,
    response_hash: str,
    trace_cid: str,
) -> str:
    """Returns a 0x-prefixed signature recoverable by the Marketplace."""
    _digest, msg = attestation_digest(
        chain_id=chain_id,
        marketplace_address=marketplace_address,
        query_id=query_id,
        response_hash=response_hash,
        trace_cid=trace_cid,
    )
    signed = Account.sign_message(msg, private_key=private_key)
    return to_hex(signed.signature)


def verify_attestation(
    *,
    signature: str,
    expected_signer: str,
    chain_id: int,
    marketplace_address: str,
    query_id: str,
    response_hash: str,
    trace_cid: str,
) -> bool:
    _digest, msg = attestation_digest(
        chain_id=chain_id,
        marketplace_address=marketplace_address,
        query_id=query_id,
        response_hash=response_hash,
        trace_cid=trace_cid,
    )
    recovered = Account.recover_message(msg, signature=to_bytes(hexstr=signature))
    return recovered.lower() == expected_signer.lower()
