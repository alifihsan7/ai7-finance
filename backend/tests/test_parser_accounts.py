import pytest
from app.core.parser import parse_transaction, parse_amount, parse_multi_transactions


def test_warkop_bri_1_16k():
    """String 'warkop bri 1 16k' must parse amount=16000, account='BRI 1', category='Jajan / Ngopi', description='Warkop'."""
    res = parse_transaction("warkop bri 1 16k")
    assert res["success"] is True
    assert res["amount"] == 16000
    assert res["account"] == "BRI 1"
    assert res["category"] == "Jajan / Ngopi"
    assert res["description"] == "Warkop"
    assert res["type"] == "expense"


def test_warkop_bri_16k():
    """String 'warkop bri 16k' must parse amount=16000, account='BRI 1', category='Jajan / Ngopi', description='Warkop'."""
    res = parse_transaction("warkop bri 16k")
    assert res["success"] is True
    assert res["amount"] == 16000
    assert res["account"] == "BRI 1"
    assert res["category"] == "Jajan / Ngopi"
    assert res["description"] == "Warkop"
    assert res["type"] == "expense"


def test_warkop_variants_and_accounts():
    """Verify BRI 2, case insensitivity, and warkop without account."""
    # BRI 2 variant
    res_bri2 = parse_transaction("warkop bri 2 16k")
    assert res_bri2["success"] is True
    assert res_bri2["amount"] == 16000
    assert res_bri2["account"] == "BRI 2"
    assert res_bri2["category"] == "Jajan / Ngopi"
    assert res_bri2["description"] == "Warkop"

    # bri1 / bri2 concatenated
    res_bri1_concat = parse_transaction("warkop bri1 16k")
    assert res_bri1_concat["account"] == "BRI 1"
    assert res_bri1_concat["amount"] == 16000

    res_bri2_concat = parse_transaction("warkop bri2 16k")
    assert res_bri2_concat["account"] == "BRI 2"
    assert res_bri2_concat["amount"] == 16000

    # Upper case
    res_upper = parse_transaction("WARKOP BRI 1 16K")
    assert res_upper["amount"] == 16000
    assert res_upper["account"] == "BRI 1"
    assert res_upper["category"] == "Jajan / Ngopi"
    assert res_upper["description"] == "Warkop"

    # Warkop without account falls back to Mandiri
    res_no_acc = parse_transaction("warkop 16k")
    assert res_no_acc["amount"] == 16000
    assert res_no_acc["account"] == "Mandiri"
    assert res_no_acc["category"] == "Jajan / Ngopi"
    assert res_no_acc["description"] == "Warkop"


def test_standard_transaction_formats():
    """Format transaksi standar lain tetap terurai dengan benar dan deterministik."""
    # Kopi 20k mandiri
    res_kopi = parse_transaction("kopi 20k mandiri")
    assert res_kopi["success"] is True
    assert res_kopi["amount"] == 20000
    assert res_kopi["account"] == "Mandiri"
    assert res_kopi["category"] == "Jajan / Ngopi"
    assert res_kopi["description"] == "Kopi"
    assert res_kopi["type"] == "expense"

    # Nasi padang 25k (default account Mandiri)
    res_padang = parse_transaction("nasi padang 25k")
    assert res_padang["success"] is True
    assert res_padang["amount"] == 25000
    assert res_padang["account"] == "Mandiri"
    assert res_padang["category"] == "Makanan & Minuman"
    assert res_padang["description"] == "Nasi padang"
    assert res_padang["type"] == "expense"

    # Gaji 5jt bri 1 (Income hub)
    res_gaji = parse_transaction("gaji 5jt bri 1")
    assert res_gaji["success"] is True
    assert res_gaji["amount"] == 5000000
    assert res_gaji["account"] == "BRI 1"
    assert res_gaji["category"] == "Pemasukan"
    assert res_gaji["description"] == "Gaji"
    assert res_gaji["type"] == "income"

    # Gaji without explicit account defaults to BRI 1
    res_gaji_default = parse_transaction("gaji 5jt")
    assert res_gaji_default["amount"] == 5000000
    assert res_gaji_default["account"] == "BRI 1"
    assert res_gaji_default["type"] == "income"


def test_explicit_unit_priority_over_quantities():
    """Nominal transaksi dengan unit eksplisit diprioritaskan dibandingkan digit tunggal porsi barang."""
    # 'nasi padang 2 25k' -> 25k is amount, 2 is quantity
    res_porsi = parse_transaction("nasi padang 2 25k")
    assert res_porsi["success"] is True
    assert res_porsi["amount"] == 25000
    assert "25k" not in res_porsi["description"].lower()
    assert "2" in res_porsi["description"]

    # 'ayam geprek 3 45k' -> 45k is amount
    res_geprek = parse_transaction("ayam geprek 3 45k")
    assert res_geprek["amount"] == 45000

    # 'mie ayam 1 porsi 15rb'
    res_mie = parse_transaction("mie ayam 1 porsi 15rb")
    assert res_mie["amount"] == 15000

    # Multi-digit amount takes precedence over single digit portion even without unit
    res_multi = parse_transaction("ayam bakar 2 25000")
    assert res_multi["amount"] == 25000


def test_parse_amount_priority_directly():
    """Direct parse_amount tests validating explicit unit prioritization."""
    # When text contains both single digit and unit amount:
    amt, matched = parse_amount("warkop bri 1 16k")
    assert amt == 16000
    assert matched == "16k"

    amt, matched = parse_amount("nasi padang 2 25k")
    assert amt == 25000
    assert matched == "25k"

    amt, matched = parse_amount("beli 1 kopi 20k")
    assert amt == 20000
    assert matched == "20k"

    amt, matched = parse_amount("roti 2 rp 20000")
    assert amt == 20000
    assert matched is not None and "20000" in matched

    amt, matched = parse_amount("roti 2 rp. 20.000")
    assert amt == 20000

    amt, matched = parse_amount("ayam 2 25000")
    assert amt == 25000

    # Standalone single digit fallback when no other candidate exists
    amt, matched = parse_amount("1")
    assert amt == 1
    assert matched == "1"


def test_various_accounts_detected():
    """Validate other bank and e-wallet account patterns."""
    assert parse_transaction("makan 50k bca")["account"] == "BCA"
    assert parse_transaction("makan 50k bank bca")["account"] == "BCA"
    assert parse_transaction("makan 50k bni")["account"] == "BNI"
    assert parse_transaction("makan 50k bank jago")["account"] == "Bank Jago"
    assert parse_transaction("makan 50k jago")["account"] == "Bank Jago"
    assert parse_transaction("invest 100k bibit")["account"] == "Bibit"
    assert parse_transaction("bensin 30k cash")["account"] == "Cash"
    assert parse_transaction("bensin 30k tunai")["account"] == "Cash"
    assert parse_transaction("kopi 25k gopay")["account"] == "GoPay"
    assert parse_transaction("kopi 25k shopeepay")["account"] == "ShopeePay"
    assert parse_transaction("kopi 25k spay")["account"] == "ShopeePay"
    assert parse_transaction("kopi 25k dana")["account"] == "DANA"
    assert parse_transaction("kopi 25k ovo")["account"] == "OVO"
    assert parse_transaction("kopi 25k seabank")["account"] == "SeaBank"


def test_parser_edge_cases():
    """Verify empty inputs, missing nominals, and multi-transactions."""
    # Empty string
    assert parse_transaction("")["success"] is False
    assert "Pesan kosong" in parse_transaction("")["error"]

    # String with account but missing nominal does not misinterpret account number as Rp 1
    res_no_amt = parse_transaction("warkop bri 1")
    assert res_no_amt["success"] is False
    assert "Nominal tidak terdeteksi" in res_no_amt["error"]

    # No number at all
    assert parse_transaction("halo apa kabar")["success"] is False

    # Multi transaction parsing
    multi = parse_multi_transactions("warkop bri 1 16k\nnasi padang 25k")
    assert len(multi) == 2
    assert multi[0]["amount"] == 16000
    assert multi[0]["account"] == "BRI 1"
    assert multi[1]["amount"] == 25000
    assert multi[1]["account"] == "Mandiri"
