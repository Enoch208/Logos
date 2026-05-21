"""Verifies the Python signer recovers to the address Solidity ecrecover
would resolve to, given the same domain-separated digest."""

from __future__ import annotations

from eth_account import Account

from logos.signing import sign_attestation, verify_attestation


CHAIN_ID = 421614
MARKETPLACE = "0xa9059cbb02b18a8b6f5a0e2e5e0e0e0e0e0e0e0e"
QUERY_ID = "0x" + "11" * 32
RESPONSE_HASH = "0x" + "22" * 32
TRACE_CID = "0x" + "33" * 32


def test_sign_and_recover_round_trip() -> None:
    acct = Account.create()
    sig = sign_attestation(
        private_key=acct.key.hex(),
        chain_id=CHAIN_ID,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )
    assert sig.startswith("0x") and len(sig) == 132
    assert verify_attestation(
        signature=sig,
        expected_signer=acct.address,
        chain_id=CHAIN_ID,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )


def test_wrong_signer_rejected() -> None:
    signer = Account.create()
    stranger = Account.create()
    sig = sign_attestation(
        private_key=signer.key.hex(),
        chain_id=CHAIN_ID,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )
    assert not verify_attestation(
        signature=sig,
        expected_signer=stranger.address,
        chain_id=CHAIN_ID,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )


def test_chain_separation_blocks_replay() -> None:
    """A signature for chainId X must not validate against chainId Y."""
    acct = Account.create()
    sig = sign_attestation(
        private_key=acct.key.hex(),
        chain_id=CHAIN_ID,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )
    assert not verify_attestation(
        signature=sig,
        expected_signer=acct.address,
        chain_id=CHAIN_ID + 1,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )


def test_contract_address_separation_blocks_replay() -> None:
    """A signature for Marketplace A must not validate for Marketplace B."""
    acct = Account.create()
    other_marketplace = "0x" + "bb" * 20
    sig = sign_attestation(
        private_key=acct.key.hex(),
        chain_id=CHAIN_ID,
        marketplace_address=MARKETPLACE,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )
    assert not verify_attestation(
        signature=sig,
        expected_signer=acct.address,
        chain_id=CHAIN_ID,
        marketplace_address=other_marketplace,
        query_id=QUERY_ID,
        response_hash=RESPONSE_HASH,
        trace_cid=TRACE_CID,
    )
