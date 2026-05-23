"""One-time: seed a fresh Atlas trader wallet with USDC on Arc.

On Arc, USDC is the native asset (18-decimal native view, 6-decimal ERC-20
view — same balance). A native value transfer credits both the Atlas wallet's
gas and its spendable USDC. Run once, save the printed key into agents/.env as
ATLAS_PRIVATE_KEY, then set SETTLEMENT_MODE=real.

Usage (from agents/, with .env sourced):
    ./.venv/bin/python scripts/seed_atlas_wallet.py            # dry run, generates wallet
    ./.venv/bin/python scripts/seed_atlas_wallet.py --confirm  # actually sends
Env:
    SPECIALIST_PRIVATE_KEY  funder (0x339fdb…), pays from its balance
    ARC_RPC_URL, ARC_CHAIN_ID
    SEED_USDC               whole USDC to send (default 2)
    ATLAS_ADDRESS           reuse an existing Atlas address (else a new one is generated)
"""
from __future__ import annotations

import os
import sys

from eth_account import Account
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware


def main() -> None:
    confirm = "--confirm" in sys.argv
    rpc = os.environ["ARC_RPC_URL"]
    chain_id = int(os.environ["ARC_CHAIN_ID"])
    funder = Account.from_key(os.environ["SPECIALIST_PRIVATE_KEY"])
    seed_usdc = float(os.environ.get("SEED_USDC", "2"))
    value_wei = int(seed_usdc * 10**18)  # native is 18-decimal on Arc

    atlas_addr = os.environ.get("ATLAS_ADDRESS")
    new_key = None
    if not atlas_addr:
        acct = Account.create()
        atlas_addr = acct.address
        new_key = acct.key.hex()

    w3 = Web3(Web3.HTTPProvider(rpc))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    print(f"funder   : {funder.address}")
    print(f"atlas    : {atlas_addr}")
    if new_key:
        print(f"ATLAS_PRIVATE_KEY (SAVE THIS): {new_key}")
    print(f"sending  : {seed_usdc} USDC ({value_wei} wei native)")

    if not confirm:
        print("\ndry run — re-run with --confirm to send")
        return

    tx = {
        "from": funder.address,
        "to": Web3.to_checksum_address(atlas_addr),
        "value": value_wei,
        "nonce": w3.eth.get_transaction_count(funder.address),
        "chainId": chain_id,
        "gas": 30_000,
        "maxFeePerGas": w3.eth.gas_price * 2,
        "maxPriorityFeePerGas": w3.eth.gas_price,
    }
    signed = funder.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    print(f"status   : {receipt['status']} · tx {tx_hash.hex()}")


if __name__ == "__main__":
    main()
