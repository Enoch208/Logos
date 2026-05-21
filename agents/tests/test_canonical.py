from logos.canonical import canonical_dumps, sha256_hex, keccak_hex


def test_canonical_is_key_sorted() -> None:
    assert canonical_dumps({"b": 1, "a": 2}) == '{"a":2,"b":1}'


def test_canonical_no_spaces() -> None:
    assert canonical_dumps({"a": [1, 2, 3]}) == '{"a":[1,2,3]}'


def test_canonical_escapes_unicode() -> None:
    # 利率保持稳定 — escaped so the byte stream matches a JS JSON.stringify
    # that also produced ASCII-escaped output.
    out = canonical_dumps({"raw": "利率保持稳定"})
    assert "\\u5229" in out  # 利
    assert "利" not in out


def test_sha256_deterministic() -> None:
    a = sha256_hex({"a": 1, "b": 2})
    b = sha256_hex({"b": 2, "a": 1})
    assert a == b
    assert a.startswith("0x") and len(a) == 66


def test_keccak_deterministic() -> None:
    a = keccak_hex({"a": 1, "b": 2})
    b = keccak_hex({"b": 2, "a": 1})
    assert a == b
    assert a.startswith("0x") and len(a) == 66
