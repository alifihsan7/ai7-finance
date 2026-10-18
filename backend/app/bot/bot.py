import os
import sys
import re
import time
import requests
from datetime import datetime, date, timedelta
import zoneinfo

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, case

from app.core.config import settings
from app.core.parser import parse_transaction, parse_multi_transactions
from app.db.session import SessionLocal, Base, engine
from app.models.transaction import Transaction
from app.models.account import Account

API_BASE = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

def format_rp(amount: int) -> str:
    return f"Rp {amount:,}".replace(",", ".")

def get_safe_to_spend_snippet(db: Session) -> str:
    now_wib = datetime.now(WIB)
    today_wib = now_wib.date()

    latest_paycheck = db.query(Transaction).filter(
        Transaction.type == "income",
        (Transaction.category == "Uang Saku Ortu") | (Transaction.description.ilike("%gajian%"))
    ).order_by(desc(Transaction.date), desc(Transaction.id)).first()

    cycle_start = latest_paycheck.date if latest_paycheck else today_wib
    cycle_end = cycle_start + timedelta(days=13)
    days_passed = (today_wib - cycle_start).days + 1
    day_of_cycle = min(14, max(1, days_passed))
    days_remaining = max(1, 14 - day_of_cycle + 1)

    pocket_budget = 825000
    mandiri_spent_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("spent")
    ).filter(
        Transaction.account == "Mandiri",
        Transaction.type == "expense",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_spent = int(mandiri_spent_row.spent if mandiri_spent_row else 0)
    pocket_remaining = max(0, pocket_budget - pocket_spent)
    safe_daily = int(pocket_remaining / days_remaining)

    ideal_daily_rate = pocket_budget / 14
    ideal_pace_today = int(ideal_daily_rate * day_of_cycle)

    if pocket_spent <= ideal_pace_today:
        pace_icon = "🟢"
        pace_label = "Pace Aman"
    else:
        pace_icon = "🔴"
        pace_label = "Agak Boros"

    return f"🛡️ **Safe-to-Spend:** {format_rp(safe_daily)} / hari ({pace_icon} {pace_label} • Sisa {days_remaining} hari)"

MAIN_KEYBOARD = {
    "keyboard": [
        [{"text": "📊 Rekap"}, {"text": "💳 Saldo"}],
        [{"text": "🔔 Tagihan / Subs"}, {"text": "📜 Transaksi"}],
        [{"text": "💰 Info Gajian"}, {"text": "🔄 Transfer"}],
        [{"text": "🌐 Web Dashboard"}],
    ],
    "resize_keyboard": True,
    "is_persistent": True,
}

def setup_bot_commands():
    commands = [
        {"command": "menu", "description": "📱 Buka tombol menu navigasi"},
        {"command": "rekap", "description": "📊 Rekap pengeluaran & pacing belanja"},
        {"command": "saldo", "description": "💳 Estimasi saldo 4 rekening"},
        {"command": "transfer", "description": "🔄 Transfer antar rekening"},
        {"command": "subs", "description": "🔔 Jadwal langganan & tagihan rutin"},
        {"command": "transaksi", "description": "📜 5 transaksi terakhir"},
        {"command": "gajian", "description": "💰 Auto-split gajian 14-harian"},
        {"command": "batal", "description": "↩️ Hapus/batalkan transaksi terakhir"},
        {"command": "help", "description": "ℹ️ Panduan cara input bot"},
    ]
    try:
        requests.post(f"{API_BASE}/setMyCommands", json={"commands": commands}, timeout=10)
    except Exception as e:
        print(f"Error registering bot commands: {e}")

def send_message(chat_id: int, text: str, parse_mode: str = "Markdown", reply_to_message_id: Optional[int] = None, reply_markup: Optional[dict] = None):
    url = f"{API_BASE}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=10)
        return res.json()
    except Exception as e:
        print(f"Error sending message: {e}")
        return None

def handle_menu(chat_id: int):
    msg = "📱 **Menu Navigasi AI7 Finance**\n\nGunakan tombol di bawah untuk akses cepat, atau ketik langsung pengeluaran lo (contoh: `makan siang 25k`)."
    send_message(chat_id, msg, reply_markup=MAIN_KEYBOARD)

def send_dashboard_link(chat_id: int):
    url = "https://alifihsan-studio.tailbdd42d.ts.net:8443"
    inline_kb = {
        "inline_keyboard": [
            [{"text": "🚀 Buka Web Dashboard", "url": url}]
        ]
    }
    send_message(chat_id, f"🌐 **Web Dashboard AI7 Finance:**\n`{url}`\n\nAkses aman via Tailscale untuk review bulanan & detail transaksi.", reply_markup=inline_kb)

def handle_start(chat_id: int):
    msg = """👋 **Halo, Alif! Selamat datang di AI7 Finance Bot.**

Bot ini dirancang khusus terintegrasi dengan PostgreSQL dan formula alokasi 14 harian lo.

💡 **Contoh Input Cepat (Otomatis Masuk Amplop):**
• `nasi padang 25k` ➔ Masuk amplop Makan (Mandiri)
• `kopi kenangan 22k` ➔ Masuk amplop Jajan (Mandiri)
• `laundry 35rb` ➔ Masuk amplop Laundry (Mandiri)
• `isi galon 8k` ➔ Masuk amplop Galon (Mandiri)
• `netflix 54k` ➔ Masuk Langganan (Bank Jago)
• `bibit 200k` ➔ Masuk Investasi (Bank Jago)
• `bensin 30k cash` ➔ Spesifik rekening Cash

📌 **Perintah Tersedia:**
• `/gajian [nominal]` - Catat gajian & split otomatis ke 4 rekening
• `/rekap` - Ringkasan pengeluaran bulan ini
• `/saldo` - Estimasi saldo per rekening
• `/subs` - Cek jadwal langganan & tagihan rutin
• `/transaksi` - 5 transaksi terakhir
• `/batal` - Hapus/batalkan input terakhir jika salah
• `/menu` - Tampilkan tombol menu cepat

Tinggal ketik catatan pengeluaran/pemasukan lo kapan saja!"""
    send_message(chat_id, msg, reply_markup=MAIN_KEYBOARD)

def handle_rekap(chat_id: int, db: Session):
    now = datetime.now(WIB)
    month_names = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    month_name = month_names[now.month]
    start_date = date(now.year, now.month, 1)
    end_date = date(now.year + 1, 1, 1) if now.month == 12 else date(now.year, now.month + 1, 1)

    totals = db.query(
        Transaction.type,
        func.coalesce(func.sum(Transaction.amount), 0).label("total")
    ).filter(
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).group_by(Transaction.type).all()

    income_total = 0
    expense_total = 0
    for r in totals:
        if r.type == "income":
            income_total = int(r.total)
        elif r.type == "expense":
            expense_total = int(r.total)

    net_total = income_total - expense_total

    cat_rows = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count")
    ).filter(
        Transaction.date >= start_date,
        Transaction.date < end_date,
        Transaction.type == "expense"
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()

    lines = [
        f"📊 **Rekap Keuangan - {month_name} {now.year}**\n",
        f"💰 **Total Pemasukan:** {format_rp(income_total)}",
        f"💸 **Total Pengeluaran:** {format_rp(expense_total)}",
        f"📈 **Net Cashflow:** {format_rp(net_total)}\n",
        "📂 **Rincian Pengeluaran per Kategori:**"
    ]

    if not cat_rows:
        lines.append("_Belum ada pengeluaran yang tercatat bulan ini._")
    else:
        for cat in cat_rows:
            lines.append(f"• **{cat.category}**: {format_rp(int(cat.total))} ({cat.count}x)")

    lines.append(f"\n{get_safe_to_spend_snippet(db)}")
    send_message(chat_id, "\n".join(lines))

def handle_saldo(chat_id: int, db: Session):
    rows = db.query(
        Transaction.account,
        func.sum(
            case((Transaction.type == "income", Transaction.amount), else_=-Transaction.amount)
        ).label("balance")
    ).group_by(Transaction.account).order_by(func.sum(
        case((Transaction.type == "income", Transaction.amount), else_=-Transaction.amount)
    ).desc()).all()

    if not rows:
        send_message(chat_id, "ℹ️ Belum ada data transaksi untuk menghitung saldo.")
        return

    lines = ["💳 **Estimasi Saldo per Rekening:**\n"]
    total = 0
    for b in rows:
        bal = int(b.balance or 0)
        total += bal
        lines.append(f"• **{b.account}**: {format_rp(bal)}")

    lines.append(f"\n💵 **Total Keseluruhan:** {format_rp(total)}")
    lines.append(f"\n{get_safe_to_spend_snippet(db)}")
    send_message(chat_id, "\n".join(lines))

def handle_transaksi(chat_id: int, db: Session):
    recent = db.query(Transaction).order_by(desc(Transaction.id)).limit(5).all()
    if not recent:
        send_message(chat_id, "ℹ️ Belum ada riwayat transaksi.")
        return

    lines = ["🕒 **5 Transaksi Terakhir:**\n"]
    for t in recent:
        icon = "💰" if t.type == "income" else "💸"
        time_str = t.created_at.astimezone(WIB).strftime("%Y-%m-%d %H:%M") if t.created_at else str(t.date)
        lines.append(f"{icon} **{t.description}** ({t.category})\n   {format_rp(t.amount)} via `{t.account}` • _{time_str}_\n")

    send_message(chat_id, "\n".join(lines))

def handle_subs(chat_id: int, db: Session):
    from app.models.subscription import Subscription
    from app.api.v1.endpoints.subscriptions import compute_due_info

    subs = db.query(Subscription).filter(Subscription.is_active == True).order_by(Subscription.billing_day.asc()).all()
    if not subs:
        send_message(chat_id, "ℹ️ Belum ada langganan / tagihan rutin yang aktif.")
        return

    now_date = datetime.now(WIB).date()
    lines = ["💳 **Daftar Langganan & Tagihan Rutin (Jago):**\n"]
    total = 0

    for s in subs:
        total += s.amount
        days_until, next_date = compute_due_info(s.billing_day, now_date)
        if days_until == 0:
            due_str = "🚨 **Jatuh tempo HARI INI!**"
        elif days_until <= 3:
            due_str = f"⚠️ Jatuh tempo {days_until} hari lagi ({next_date})"
        else:
            due_str = f"🗓️ Tgl {s.billing_day} ({days_until} hari lagi)"

        lines.append(f"• **{s.name}**: {format_rp(s.amount)}/bln\n  └ {due_str} ({s.category})")

    lines.append(f"\n💵 **Total Komitmen Bulanan:** {format_rp(total)}")
    lines.append("💡 _Saldo pos Jago lo disiapkan otomatis dari 31.7% gajian._")
    send_message(chat_id, "\n".join(lines))

def normalize_account(raw: str):
    if not raw:
        return None
    r = raw.strip().lower()
    if "mandiri" in r:
        return "Mandiri"
    elif "bibit" in r:
        return "Bibit"
    elif "jago" in r:
        return "Bank Jago"
    elif "bri 1" in r or "bri1" in r:
        return "BRI 1"
    elif "bri 2" in r or "bri2" in r:
        return "BRI 2"
    elif "cash" in r or "tunai" in r:
        return "Cash"
    return None

def handle_transfer(chat_id: int, text: str, db: Session):
    clean = text.strip()
    if clean.lower() in ["/transfer", "transfer", "tf", "🔄 transfer"]:
        guide = """🔄 **Panduan Transfer Antar Rekening**

Gunakan format:
`/transfer [nominal] dari [asal] ke [tujuan] [catatan]`
atau singkat:
`tf 100k mandiri ke bri 1 [catatan]`

💡 **Contoh Praktis:**
• `/transfer 200k dari mandiri ke bri 1 dana darurat`
• `tf 150rb mandiri ke jago top up subs`
• `tf 50k bri 1 ke mandiri tarik tunai`

🏦 **Pilihan Rekening:**
`Mandiri`, `Jago`, `BRI 1`, `BRI 2`, `Cash`

ℹ️ _Transfer antar rekening hanya memindahkan saldo & tidak memotong batas pengeluaran (Safe-to-Spend)._"""
        send_message(chat_id, guide)
        return

    pattern = re.compile(r"^(?:/transfer|transfer|tf)\s+([\d\.\,kKrbRB]+)\s+(?:dari\s+)?([a-zA-Z0-9\s]+?)\s+ke\s+([a-zA-Z0-9\s]+?)(?:\s*[:\-]\s*(.*)|\s+(.*))?$", re.IGNORECASE)
    match = pattern.match(clean)
    if not match:
        send_message(chat_id, "⚠️ Format transfer tidak dikenali.\n\nContoh:\n`tf 100k mandiri ke bri 1`\natau ketik `/transfer` untuk panduan lengkap.")
        return

    amt_str, from_raw, to_raw, desc1, desc2 = match.groups()
    from app.core.parser import parse_amount
    amt, _ = parse_amount(amt_str)
    if not amt or amt <= 0:
        send_message(chat_id, "⚠️ Nominal transfer tidak valid.")
        return

    from_acc = normalize_account(from_raw)
    to_acc = normalize_account(to_raw)

    if not from_acc:
        send_message(chat_id, f"⚠️ Rekening asal `{from_raw}` tidak dikenali.\nPilihan: Mandiri, Jago, BRI 1, BRI 2, Cash.")
        return
    if not to_acc:
        send_message(chat_id, f"⚠️ Rekening tujuan `{to_raw}` tidak dikenali.\nPilihan: Mandiri, Jago, BRI 1, BRI 2, Cash.")
        return
    if from_acc == to_acc:
        send_message(chat_id, "⚠️ Rekening asal dan rekening tujuan tidak boleh sama.")
        return

    desc = (desc1 or desc2 or "Transfer Antar Rekening").strip()
    now_wib = datetime.now(WIB)
    tx_date = now_wib.date()

    tx_out = Transaction(
        type="transfer_out",
        amount=int(amt),
        account=from_acc,
        category="Transfer",
        description=f"Transfer ke {to_acc}: {desc}",
        raw_text=f"bot transfer: {clean}",
        date=tx_date
    )
    tx_in = Transaction(
        type="transfer_in",
        amount=int(amt),
        account=to_acc,
        category="Transfer",
        description=f"Transfer dari {from_acc}: {desc}",
        raw_text=f"bot transfer: {clean}",
        date=tx_date
    )

    db.add(tx_out)
    db.add(tx_in)
    db.commit()

    def get_acc_balance(acc_name):
        row = db.query(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type.in_(["income", "transfer_in"]), Transaction.amount),
                        (Transaction.type.in_(["expense", "transfer_out"]), -Transaction.amount),
                        else_=0
                    )
                ), 0
            )
        ).filter(Transaction.account == acc_name).scalar()
        return int(row or 0)

    bal_from = get_acc_balance(from_acc)
    bal_to = get_acc_balance(to_acc)

    res_msg = f"""🔄 **Transfer Antar Rekening Berhasil!**

💸 **Nominal:** `{format_rp(int(amt))}`
📤 **Dari:** {from_acc} (Sisa Saldo: `{format_rp(bal_from)}`)
📥 **Ke:** {to_acc} (Saldo Baru: `{format_rp(bal_to)}`)
📝 **Keterangan:** {desc}

ℹ️ _Saldo berhasil dipindahkan. Transaksi ini tidak memotong kuota Safe-to-Spend._"""
    send_message(chat_id, res_msg)

def handle_batal(chat_id: int, db: Session):
    last = db.query(Transaction).order_by(desc(Transaction.id)).first()
    if not last:
        send_message(chat_id, "⚠️ Tidak ada transaksi yang bisa dibatalkan.")
        return

    deleted_info = {
        "description": last.description,
        "amount": last.amount,
        "account": last.account,
        "category": last.category
    }

    if last.type == "transfer_in":
        prev = db.query(Transaction).filter(
            Transaction.id == last.id - 1,
            Transaction.type == "transfer_out",
            Transaction.amount == last.amount
        ).first()
        if prev:
            db.delete(prev)

    db.delete(last)
    db.commit()

    msg = f"""🗑️ **Transaksi Terakhir Dibatalkan!**

• **Deskripsi:** {deleted_info['description']}
• **Nominal:** {format_rp(deleted_info['amount'])}
• **Rekening:** {deleted_info['account']}
• **Kategori:** {deleted_info['category']}

Catatan tersebut sudah dihapus dari database PostgreSQL."""
    send_message(chat_id, msg)

def handle_gajian(chat_id: int, text: str, db: Session):
    parts = text.split()
    total = 1500000
    if len(parts) > 1:
        from app.core.parser import parse_amount
        parsed_amt, _ = parse_amount(parts[1])
        if parsed_amt and parsed_amt > 0:
            total = int(parsed_amt)

    now = datetime.now(WIB)
    cycle_start = now.date()
    cycle_end = cycle_start + timedelta(days=13)

    if total == 1500000:
        mandiri_amt = 825000
        jago_amt = 275000
        bibit_amt = 200000
        bri1_amt = 100000
        bri2_amt = 100000
    else:
        mandiri_amt = int(round(total * 0.55))
        jago_amt = int(round(total * 0.18333333))
        bibit_amt = int(round(total * 0.13333333))
        bri1_amt = int(round(total * 0.06666667))
        bri2_amt = total - (mandiri_amt + jago_amt + bibit_amt + bri1_amt)

    allocations = [
        ("Mandiri", mandiri_amt, "Uang Saku Harian Mandiri (Makan, Jajan, Laundry, Galon)"),
        ("Bank Jago", jago_amt, "Alokasi Langganan & Tagihan Rutin Jago"),
        ("Bibit", bibit_amt, "Alokasi Investasi Reksadana/Saham Bibit"),
        ("BRI 1", bri1_amt, "Alokasi Dana Darurat BRI 1"),
        ("BRI 2", bri2_amt, "Alokasi Tabungan Kunci BRI 2"),
    ]

    for acc, amt, desc in allocations:
        tx = Transaction(
            type="income",
            amount=amt,
            account=acc,
            category="Uang Saku Ortu",
            description=f"Gajian ({desc})",
            raw_text=f"paycheck split /gajian: {total} -> {acc} {amt}",
            date=cycle_start
        )
        db.add(tx)

    db.commit()

    msg = f"""🎉 **GAJIAN MASUK & ALOKASI OTOMATIS TERCATAT!**

💰 **Total Uang Saku:** {format_rp(total)}
📅 **Siklus 14 Hari:** {cycle_start.strftime('%d %b')} – {cycle_end.strftime('%d %b %Y')}

📊 **Distribusi Otomatis ke 5 Rekening / Pos:**
• **Mandiri (55%):** {format_rp(mandiri_amt)}
  └ *Makan Rp 450k | Jajan Rp 100k | Laundry Rp 70k | Galon Rp 44k*
• **Bank Jago (18.3%):** {format_rp(jago_amt)}
  └ *Langganan & Tagihan Rutin*
• **Bibit (13.3%):** {format_rp(bibit_amt)}
  └ *Investasi Tabungan Reksadana/Saham*
• **BRI 1 (6.7%):** {format_rp(bri1_amt)}
  └ *Hub Gajian & Dana Darurat*
• **BRI 2 (6.7%):** {format_rp(bri2_amt)}
  └ *Tabungan Terkunci*

✅ Kelima rekening telah otomatis dikreditkan di PostgreSQL dan tersinkronisasi ke Dashboard Web!"""

    send_message(chat_id, msg)

def handle_text_message(chat_id: int, text: str, message_id: int, db: Session):
    items = parse_multi_transactions(text)
    if not items:
        # Fall back to single parser to report specific error
        fallback = parse_transaction(text)
        err_msg = fallback.get("error", "Format tidak terdeteksi.")
        send_message(chat_id, f"❌ {err_msg}", reply_to_message_id=message_id)
        return

    now_wib = datetime.now(WIB)
    time_str = now_wib.strftime("%Y-%m-%d %H:%M:%S")
    start_date = date(now_wib.year, now_wib.month, 1)

    MANDIRI_ENVELOPES = {
        "Makanan & Minuman": 450000,
        "Jajan / Ngopi": 100000,
        "Laundry": 70000,
        "Galon & Air": 44000,
    }

    # If single transaction
    if len(items) == 1:
        parsed = items[0]
        tx = Transaction(
            type=parsed["type"],
            amount=parsed["amount"],
            account=parsed["account"],
            category=parsed["category"],
            description=parsed["description"],
            raw_text=parsed.get("raw_text", ""),
            date=now_wib.date()
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        type_label = "Pemasukan" if tx.type == "income" else "Pengeluaran"
        icon = "💰" if tx.type == "income" else "💸"

        reply = f"""✅ **Tercatat!**

{icon} **{type_label}:** {format_rp(tx.amount)}
📂 **Kategori:** {tx.category}
💳 **Rekening:** {tx.account}
📝 **Keterangan:** {tx.description}
🕒 _{time_str} WIB_"""

        if tx.type == "expense" and tx.account == "Mandiri" and tx.category in MANDIRI_ENVELOPES:
            limit = MANDIRI_ENVELOPES[tx.category]
            spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                Transaction.account == "Mandiri",
                Transaction.type == "expense",
                Transaction.category == tx.category,
                Transaction.date >= start_date
            ).scalar()
            spent_int = int(spent or 0)
            rem = limit - spent_int
            pct = round(spent_int / limit * 100, 1)
            status_icon = "⚠️" if pct > 85 else "📊"
            reply += f"\n\n{status_icon} **Status Amplop Mandiri (Bulan Ini):**\n• Kuota Terpakai: {format_rp(spent_int)} / {format_rp(limit)} ({pct}%)\n• Sisa Kuota: **{format_rp(rem)}**"

        if tx.type == "expense":
            reply += f"\n\n{get_safe_to_spend_snippet(db)}"

        send_message(chat_id, reply, reply_to_message_id=message_id)
        return

    # If multiple transactions in one message
    created_txs = []
    total_amount = 0
    categories_touched = set()

    for parsed in items:
        tx = Transaction(
            type=parsed["type"],
            amount=parsed["amount"],
            account=parsed["account"],
            category=parsed["category"],
            description=parsed["description"],
            raw_text=parsed.get("raw_text", ""),
            date=now_wib.date()
        )
        db.add(tx)
        created_txs.append(tx)
        total_amount += tx.amount
        if tx.account == "Mandiri" and tx.type == "expense":
            categories_touched.add(tx.category)

    db.commit()
    for tx in created_txs:
        db.refresh(tx)

    lines = [f"✅ **{len(created_txs)} Transaksi Berhasil Dicatat!**\n"]
    for idx, tx in enumerate(created_txs, 1):
        icon = "💰" if tx.type == "income" else "💸"
        lines.append(f"{idx}. {icon} **{format_rp(tx.amount)}** • {tx.description}\n   📂 `{tx.category}` • 💳 `{tx.account}`")

    lines.append(f"\n💵 **Total:** {format_rp(total_amount)}")
    lines.append(f"🕒 _{time_str} WIB_")

    # Add envelope updates for all affected Mandiri categories
    mandiri_status_lines = []
    for cat in categories_touched:
        if cat in MANDIRI_ENVELOPES:
            limit = MANDIRI_ENVELOPES[cat]
            spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                Transaction.account == "Mandiri",
                Transaction.type == "expense",
                Transaction.category == cat,
                Transaction.date >= start_date
            ).scalar()
            spent_int = int(spent or 0)
            rem = limit - spent_int
            pct = round(spent_int / limit * 100, 1)
            mandiri_status_lines.append(f"• **{cat}:** {format_rp(spent_int)} / {format_rp(limit)} ({pct}%) ➔ Sisa: {format_rp(rem)}")

    if mandiri_status_lines:
        lines.append("\n📊 **Status Amplop Mandiri (Bulan Ini):**\n" + "\n".join(mandiri_status_lines))

    lines.append(f"\n{get_safe_to_spend_snippet(db)}")

    send_message(chat_id, "\n".join(lines), reply_to_message_id=message_id)

def process_update(update: dict):
    message = update.get("message")
    if not message:
        return

    user = message.get("from", {})
    user_id = user.get("id")
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    message_id = message.get("message_id")

    if user_id != settings.ALLOWED_USER_ID:
        print(f"Blocked unauthorized user: {user_id} ({user.get('username')})")
        send_message(chat_id, "⛔ Akses ditolak. Bot ini bersifat privat.")
        return

    if not text:
        return

    lower_text = text.lower()
    cmd = text.split()[0].lower()
    db = SessionLocal()
    try:
        if lower_text in ["📊 rekap", "rekap"]:
            handle_rekap(chat_id, db)
        elif lower_text in ["💳 saldo", "saldo"]:
            handle_saldo(chat_id, db)
        elif lower_text in ["🔔 tagihan / subs", "tagihan", "subs", "langganan"]:
            handle_subs(chat_id, db)
        elif lower_text in ["📜 transaksi", "transaksi", "history"]:
            handle_transaksi(chat_id, db)
        elif lower_text in ["💰 info gajian"]:
            handle_gajian(chat_id, "/gajian", db)
        elif lower_text in ["🌐 web dashboard", "dashboard", "web"] or cmd in ["/web", "/dashboard"]:
            send_dashboard_link(chat_id)
        elif lower_text in ["📱 menu", "menu"] or cmd in ["/menu"]:
            handle_menu(chat_id)
        elif lower_text in ["🔄 transfer", "transfer", "tf"] or cmd in ["/transfer", "/tf"] or lower_text.startswith("transfer ") or lower_text.startswith("tf "):
            handle_transfer(chat_id, text, db)
        elif cmd in ["/start", "/help"]:
            handle_start(chat_id)
        elif cmd in ["/gajian"]:
            handle_gajian(chat_id, text, db)
        elif cmd in ["/transfer", "🔄 transfer"]:
            handle_transfer(chat_id, text, db)
        elif cmd in ["/rekap", "/bulan"]:
            handle_rekap(chat_id, db)
        elif cmd in ["/saldo"]:
            handle_saldo(chat_id, db)
        elif cmd in ["/transaksi", "/history"]:
            handle_transaksi(chat_id, db)
        elif cmd in ["/batal", "/undo", "/hapus"]:
            handle_batal(chat_id, db)
        elif cmd in ["/subs", "/langganan", "/tagihan"]:
            handle_subs(chat_id, db)
        else:
            handle_text_message(chat_id, text, message_id, db)
    finally:
        db.close()

def main():
    print("Connecting to PostgreSQL and creating tables if not exist...")
    Base.metadata.create_all(bind=engine)
    print("Setting up Telegram bot commands menu...")
    setup_bot_commands()
    print("AI7 Finance Bot (PostgreSQL) started listening...")

    offset = 0
    while True:
        try:
            url = f"{API_BASE}/getUpdates?offset={offset}&timeout=30"
            resp = requests.get(url, timeout=35)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        process_update(update)
            else:
                time.sleep(2)
        except requests.exceptions.Timeout:
            continue
        except requests.exceptions.RequestException as e:
            print(f"Network error: {e}")
            time.sleep(3)
        except Exception as e:
            print(f"Unexpected error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
