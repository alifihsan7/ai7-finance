import os
import sys
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

API_BASE = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

def format_rp(amount: int) -> str:
    return f"Rp {amount:,}".replace(",", ".")

def send_message(chat_id: int, text: str, parse_mode: str = "Markdown", reply_to_message_id: Optional[int] = None):
    url = f"{API_BASE}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    try:
        res = requests.post(url, json=payload, timeout=10)
        return res.json()
    except Exception as e:
        print(f"Error sending message: {e}")
        return None

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
• `/transaksi` - 5 transaksi terakhir
• `/batal` - Hapus/batalkan input terakhir jika salah

Tinggal ketik catatan pengeluaran/pemasukan lo kapan saja!"""
    send_message(chat_id, msg)

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
        jago_amt = 475000
        bri1_amt = 100000
        bri2_amt = 100000
    else:
        mandiri_amt = int(round(total * 0.55))
        jago_amt = int(round(total * 0.31666667))
        bri1_amt = int(round(total * 0.06666667))
        bri2_amt = total - (mandiri_amt + jago_amt + bri1_amt)

    allocations = [
        ("Mandiri", mandiri_amt, "Uang Saku Harian Mandiri (Makan, Jajan, Laundry, Galon)"),
        ("Bank Jago", jago_amt, "Alokasi Subs & Invest Bibit Jago"),
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

📊 **Distribusi Otomatis ke 4 Rekening:**
• **Mandiri (55%):** {format_rp(mandiri_amt)}
  └ *Makan Rp 450k | Jajan Rp 100k | Laundry Rp 70k | Galon Rp 44k*
• **Bank Jago (31.7%):** {format_rp(jago_amt)}
  └ *Subs Rp 275k | Bibit Invest Rp 200k*
• **BRI 1 (6.7%):** {format_rp(bri1_amt)}
  └ *Hub Gajian & Dana Darurat*
• **BRI 2 (6.7%):** {format_rp(bri2_amt)}
  └ *Tabungan Terkunci*

✅ Keempat rekening telah otomatis dikreditkan di PostgreSQL dan tersinkronisasi ke Dashboard Web!"""

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

    cmd = text.split()[0].lower()
    db = SessionLocal()
    try:
        if cmd in ["/start", "/help"]:
            handle_start(chat_id)
        elif cmd in ["/gajian"]:
            handle_gajian(chat_id, text, db)
        elif cmd in ["/rekap", "/bulan"]:
            handle_rekap(chat_id, db)
        elif cmd in ["/saldo"]:
            handle_saldo(chat_id, db)
        elif cmd in ["/transaksi", "/history"]:
            handle_transaksi(chat_id, db)
        elif cmd in ["/batal", "/undo", "/hapus"]:
            handle_batal(chat_id, db)
        else:
            handle_text_message(chat_id, text, message_id, db)
    finally:
        db.close()

def main():
    print("Connecting to PostgreSQL and creating tables if not exist...")
    Base.metadata.create_all(bind=engine)
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
