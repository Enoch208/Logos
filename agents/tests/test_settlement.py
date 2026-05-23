"""FR-3 — EIP-3009 ReceiveWithAuthorization sign/verify/encode/decode."""
from __future__ import annotations

import time

import pytest
from eth_account import Account

from logos.settlement import (
    SettlementError,
    decode_header,
    domain_separator,
    encode_header,
    sign_receive_authorization,
    verify_authorization,
)

CHAIN = 5042002  # Arc testnet
USDC = "0x3600000000000000000000000000000000000000"


def test_domain_separator_matches_onchain() -> None:
    assert domain_separator(5042002, USDC) == (
        "0x361191522483d32a83e70ae7183b4b9629442c13a78bc9921d6f707911c8c6b0"
    )


def test_sign_then_verify_round_trip() -> None:
    trader = Account.create()
    payee = Account.create()
    auth = sign_receive_authorization(
        trader.key, to=payee.address, value=150, chain_id=CHAIN, usdc=USDC
    )
    assert auth["from"].lower() == trader.address.lower()
    recovered = verify_authorization(
        auth, expected_payee=payee.address, min_value=150, chain_id=CHAIN, usdc=USDC
    )
    assert recovered.lower() == trader.address.lower()


def test_verify_rejects_wrong_payee() -> None:
    trader, payee, other = Account.create(), Account.create(), Account.create()
    auth = sign_receive_authorization(
        trader.key, to=payee.address, value=150, chain_id=CHAIN, usdc=USDC
    )
    with pytest.raises(SettlementError, match="payee"):
        verify_authorization(
            auth, expected_payee=other.address, min_value=150, chain_id=CHAIN, usdc=USDC
        )


def test_verify_rejects_value_below_price() -> None:
    trader, payee = Account.create(), Account.create()
    auth = sign_receive_authorization(
        trader.key, to=payee.address, value=100, chain_id=CHAIN, usdc=USDC
    )
    with pytest.raises(SettlementError, match="value"):
        verify_authorization(
            auth, expected_payee=payee.address, min_value=150, chain_id=CHAIN, usdc=USDC
        )


def test_verify_rejects_expired() -> None:
    trader, payee = Account.create(), Account.create()
    auth = sign_receive_authorization(
        trader.key, to=payee.address, value=150, chain_id=CHAIN, usdc=USDC
    )
    auth["validBefore"] = int(time.time()) - 5
    with pytest.raises(SettlementError, match="expired"):
        verify_authorization(
            auth, expected_payee=payee.address, min_value=150, chain_id=CHAIN, usdc=USDC
        )


def test_verify_rejects_tampered_signature() -> None:
    trader, payee = Account.create(), Account.create()
    auth = sign_receive_authorization(
        trader.key, to=payee.address, value=150, chain_id=CHAIN, usdc=USDC
    )
    auth["value"] = 999999  # changed after signing → signer won't recover to `from`
    with pytest.raises(SettlementError):
        verify_authorization(
            auth, expected_payee=payee.address, min_value=150, chain_id=CHAIN, usdc=USDC
        )


def test_header_round_trip() -> None:
    trader, payee = Account.create(), Account.create()
    auth = sign_receive_authorization(
        trader.key, to=payee.address, value=150, chain_id=CHAIN, usdc=USDC
    )
    assert decode_header(encode_header(auth)) == auth


def test_decode_header_rejects_garbage() -> None:
    with pytest.raises(SettlementError):
        decode_header("!!!not-base64!!!")
