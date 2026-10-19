import os
import sys
import re
import time
import logging
import requests
from datetime import datetime, date, timedelta
import zoneinfo

logger = logging.getLogger("ai7-finance-bot")

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, case

from app.core.config import settings
from app.core.parser import parse_transaction, parse_multi_transactions
from app.db.session import SessionLocal, Base, engine
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.paycheck import PaycheckConfig, PaycheckBucket
from app.models.user import User

API_BASE = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

def format_rp(amount: int) -> str:
    return f"Rp {amount:,}".replace(",", ".")

def get_safe_to_spend_snippet(db: Session, user_id: int = 1) -> str:
    now_wib = datetime.now(WIB)
    today_wib = now_wib.date()

    cfg = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == user_id).first()
    cycle_days = cfg.cycle_days if cfg and cfg.cycle_days > 0 else 14
    pocket_account = cfg.pocket_account if cfg and cfg.pocket_account else "Mandiri"

    latest_paycheck = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "income",
        (Transaction.category == "Uang Saku Ortu") | (Transaction.description.ilike("%gajian%"))
    ).order_by(desc(Transaction.date), desc(Transaction.id)).first()

    cycle_start = cfg.cycle_start_date if cfg and cfg.cycle_start_date else (latest_paycheck.date if latest_paycheck else today_wib)
    cycle_end = cycle_start + timedelta(days=cycle_days - 1)
    days_passed = (today_wib - cycle_start).days + 1
    day_of_cycle = min(cycle_days, max(1, days_passed))
    days_remaining = max(1, cycle_days - day_of_cycle + 1)

    pocket_income_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("inc")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.account == pocket_account,
        Transaction.type == "income",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_budget = int(pocket_income_row.inc) if pocket_income_row and pocket_income_row.inc > 0 else (cfg.total_salary if cfg else 825000)

    spent_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("spent")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.account == pocket_account,
        Transaction.type == "expense",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_spent = int(spent_row.spent if spent_row else 0)
    pocket_remaining = max(0, pocket_budget - pocket_spent)
    safe_daily = int(pocket_remaining / days_remaining)

    ideal_daily_rate = pocket_budget / cycle_days
    ideal_pace_today = int(ideal_daily_rate * day_of_cycle)

    if pocket_spent <= ideal_pace_today:
        pace_icon = "🟢"
        pace_label = "Pace Aman"
    else:
        pace_icon = "🔴"
        pace_label = "Agak Boros"

    return f"🛡️ **Safe-to-Spend:** {format_rp(safe_daily)} / hari ({pace_icon} {pace_label} • Sisa {days_remaining} hari)"

def get_main_keyboard() -> dict:
    url = settings.APP_BASE_URL
    dashboard_btn = (
        {"text": "🚀 Buka Dashboard", "web_app": {"url": url}}
        if url.startswith("https://")
        else {"text": "🌐 Web Dashboard"}
    )
    return {
        "keyboard": [
            [{"text": "📊 Rekap"}, {"text": "💳 Saldo"}],
            [{"text": "🎯 Target & Goals"}, {"text": "🔔 Tagihan / Subs"}],
            [{"text": "📜 Transaksi"}, {"text": "🔄 Transfer"}],
            [{"text": "💰 Info Gajian"}, {"text": "📑 Google Sheets"}],
            [dashboard_btn],
        ],
        "resize_keyboard": True,
        "is_persistent": True,
    }

def setup_bot_commands():
    commands = [
        {"command": "menu", "description": "📱 Buka tombol menu navigasi"},
        {"command": "rekap", "description": "📊 Rekap pengeluaran & pacing belanja"},
        {"command": "saldo", "description": "💳 Estimasi saldo seluruh rekening"},
        {"command": "goals", "description": "🎯 Target tabungan & milestone finansial"},
        {"command": "transfer", "description": "🔄 Transfer antar rekening"},
        {"command": "subs", "description": "🔔 Jadwal langganan & tagihan rutin"},
        {"command": "transaksi", "description": "📜 5 transaksi terakhir"},
        {"command": "gajian", "description": "💰 Auto-split alokasi gajian sesuai siklus"},
        {"command": "sheets", "description": "📑 Sinkronisasi snapshot ke Google Sheets"},
        {"command": "batal", "description": "↩️ Hapus/batalkan transaksi terakhir"},
        {"command": "help", "description": "ℹ️ Panduan cara input bot"},
    ]
    try:
        requests.post(f"{API_BASE}/setMyCommands", json={"commands": commands}, timeout=10)
    except Exception as e:
        print(f"Error registering bot commands: {e}")

    url = settings.APP_BASE_URL
    if url.startswith("https://"):
        try:
            requests.post(
                f"{API_BASE}/setChatMenuButton",
                json={
                    "menu_button": {
                        "type": "web_app",
                        "text": "📊 Dashboard",
                        "web_app": {"url": url}
                    }
                },
                timeout=10
            )
        except Exception as e:
            print(f"Error registering bot menu button: {e}")

def send_message(chat_id: int, text: str, parse_mode: Optional[str] = "Markdown", reply_to_message_id: Optional[int] = None, reply_markup: Optional[dict] = None, bot_token: Optional[str] = None):
    token = bot_token or settings.BOT_TOKEN
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=10)
        data = res.json()
        if not data.get("ok"):
            print(f"Telegram API warning sending message to {chat_id}: {data}")
            if parse_mode and "can't parse entities" in data.get("description", "").lower():
                payload.pop("parse_mode", None)
                retry_res = requests.post(url, json=payload, timeout=10)
                return retry_res.json()
        return data
    except Exception as e:
        print(f"Error sending message: {e}")
        return None

def handle_menu(chat_id: int, bot_token: Optional[str] = None):
    msg = "📱 **Menu Navigasi AI7 Finance**\n\nGunakan tombol di bawah untuk akses cepat, atau ketik langsung pengeluaran lo (contoh: `makan siang 25k`)."
    send_message(chat_id, msg, reply_markup=get_main_keyboard(), bot_token=bot_token)

def send_dashboard_link(chat_id: int, bot_token: Optional[str] = None):
    url = settings.APP_BASE_URL
    if url.startswith("https://"):
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🚀 Buka Mini App (In-App)", "web_app": {"url": url}}],
                [{"text": "🔗 Buka di Browser Luar", "url": url}]
            ]
        }
        msg = f"🌐 **Web Dashboard AI7 Finance:**\n`{url}`\n\nKlik tombol di bawah untuk membuka dashboard langsung di dalam Telegram!"
    else:
        inline_kb = {
            "inline_keyboard": [
                [{"text": "🚀 Buka Web Dashboard", "url": url}]
            ]
        }
        msg = f"🌐 **Web Dashboard AI7 Finance:**\n`{url}`\n\nAkses aman via Cloudflare Tunnel untuk review bulanan & detail transaksi."
    send_message(chat_id, msg, reply_markup=inline_kb, bot_token=bot_token)

def handle_start(chat_id: int, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_name = user.full_name if user else "Kawan"
    msg = f"""👋 **Halo, {user_name}! Selamat datang di AI7 Finance Bot.**

Bot ini terintegrasi langsung dengan Web Dashboard AI7 Finance lo.

💡 **Cara Input Praktis:**
• ✍️ **Ketik Teks Bebas:** `nasi padang 25k`, `kopi tuku 22k`, `laundry 35rb`, `isi galon 8k`
• 📸 **Kirim Foto Struk / QRIS:** Cukup kirim foto struk belanja kasir atau screenshot QRIS
• 🎙️ **Kirim Voice Note:** Rekam suara lo (misal: *"beli makan siang 28 ribu pakai mandiri"*)
• 🔄 **Transfer Rekening:** `tf 100k mandiri ke bri 1 tabungan`

📌 **Perintah Tersedia:**
• `/saldo` - Estimasi saldo per rekening & total net worth
• `/rekap` - Ringkasan pengeluaran bulan ini
• `/transaksi` - 5 transaksi terakhir
• `/batal` - Hapus/batalkan transaksi terakhir jika salah
• `/subs` - Cek jadwal langganan & tagihan rutin
• `/goals` - Pantau target finansial & milestone
• `/gajian [nominal]` - Catat gajian & split alokasi rekening
• `/menu` - Tampilkan tombol menu cepat

Tinggal ketik catatan pengeluaran/pemasukan lo kapan saja!"""
    send_message(chat_id, msg, reply_markup=get_main_keyboard(), bot_token=bot_token)

def handle_rekap(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
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
        Transaction.user_id == user_id,
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
        Transaction.user_id == user_id,
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

    lines.append(f"\n{get_safe_to_spend_snippet(db, user_id=user_id)}")
    send_message(chat_id, "\n".join(lines), bot_token=bot_token)

def handle_saldo(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    rows = db.query(
        Transaction.account,
        func.sum(
            case((Transaction.type.in_(["income", "transfer_in"]), Transaction.amount), else_=-Transaction.amount)
        ).label("balance")
    ).filter(
        Transaction.user_id == user_id
    ).group_by(Transaction.account).order_by(func.sum(
        case((Transaction.type.in_(["income", "transfer_in"]), Transaction.amount), else_=-Transaction.amount)
    ).desc()).all()

    if not rows:
        send_message(chat_id, "ℹ️ Belum ada data transaksi untuk menghitung saldo.", bot_token=bot_token)
        return

    lines = ["💳 **Estimasi Saldo per Rekening:**\n"]
    total = 0
    for b in rows:
        bal = int(b.balance or 0)
        total += bal
        lines.append(f"• **{b.account}**: {format_rp(bal)}")

    lines.append(f"\n💵 **Total Keseluruhan:** {format_rp(total)}")
    lines.append(f"\n{get_safe_to_spend_snippet(db, user_id=user_id)}")
    send_message(chat_id, "\n".join(lines), bot_token=bot_token)

def handle_pacing(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    now_wib = datetime.now(WIB)
    today_wib = now_wib.date()

    cfg = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == user_id).first()
    cycle_days = cfg.cycle_days if cfg and cfg.cycle_days > 0 else 14
    pocket_account = cfg.pocket_account if cfg and cfg.pocket_account else "Mandiri"

    latest_paycheck = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "income",
        (Transaction.category == "Uang Saku Ortu") | (Transaction.description.ilike("%gajian%"))
    ).order_by(desc(Transaction.date), desc(Transaction.id)).first()

    cycle_start = cfg.cycle_start_date if cfg and cfg.cycle_start_date else (latest_paycheck.date if latest_paycheck else today_wib)
    cycle_end = cycle_start + timedelta(days=cycle_days - 1)
    days_passed = (today_wib - cycle_start).days + 1
    day_of_cycle = min(cycle_days, max(1, days_passed))
    days_remaining = max(1, cycle_days - day_of_cycle + 1)

    pocket_income_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("inc")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.account == pocket_account,
        Transaction.type == "income",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_budget = int(pocket_income_row.inc) if pocket_income_row and pocket_income_row.inc > 0 else (cfg.total_salary if cfg else 825000)

    spent_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("spent")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.account == pocket_account,
        Transaction.type == "expense",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_spent = int(spent_row.spent if spent_row else 0)
    pocket_remaining = max(0, pocket_budget - pocket_spent)
    safe_daily = int(pocket_remaining / days_remaining)

    ratio = min(1.0, pocket_spent / pocket_budget) if pocket_budget > 0 else 0
    filled = int(round(ratio * 10))
    bar = f"[{'█' * filled}{'░' * (10 - filled)}] {int(ratio * 100)}%"

    ideal_daily_rate = pocket_budget / cycle_days
    ideal_pace_today = int(ideal_daily_rate * day_of_cycle)

    if pocket_spent <= ideal_pace_today:
        pace_status = "🟢 On Track (Pengeluaran hemat & terkontrol)"
    elif pocket_spent <= ideal_pace_today * 1.15:
        pace_status = "🟡 Pacing Warning (Mendekati batas rata-rata)"
    else:
        pace_status = "🔴 Over Budget (Pengeluaran melebihi laju harian)"

    lines = [
        "🎯 **AI7.Steward — Status Pacing Belanja Kantong**",
        f"📅 Siklus: `{cycle_start} s/d {cycle_end}` (Hari ke-{day_of_cycle}/{cycle_days})",
        f"🕒 `{now_wib.strftime('%d %B %Y - %H:%M WIB')}`",
        "──────────────────────────────",
        f"💳 **Rekening Kantong:** `{pocket_account}`",
        f"📊 **Burn Rate:** `{bar}`",
        f"• Terpakai: `{format_rp(pocket_spent)}` / `{format_rp(pocket_budget)}`",
        f"• Sisa Budget Siklus: **{format_rp(pocket_remaining)}** ({days_remaining} hari lagi)",
        f"• Batas Aman Belanja: **{format_rp(safe_daily)} / hari**",
        "",
        f"🛡️ **Status Disiplin:** {pace_status}",
    ]
    send_message(chat_id, "\n".join(lines), bot_token=bot_token)

def handle_obsidian(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    if user_id != 1:
        send_message(chat_id, "ℹ️ Fitur ekspor Obsidian hanya aktif untuk akun utama Alif.", bot_token=bot_token)
        return

    now_wib = datetime.now(WIB)
    vault_path = "/home/alifihsan/SecondBrainAI7"
    finance_dir = os.path.join(vault_path, "2 Areas", "Finance")
    os.makedirs(finance_dir, exist_ok=True)

    cfg = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == user_id).first()
    cycle_days = cfg.cycle_days if cfg and cfg.cycle_days > 0 else 14
    pocket_account = cfg.pocket_account if cfg and cfg.pocket_account else "Mandiri"

    latest_paycheck = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "income",
        (Transaction.category == "Uang Saku Ortu") | (Transaction.description.ilike("%gajian%"))
    ).order_by(desc(Transaction.date), desc(Transaction.id)).first()

    today_wib = now_wib.date()
    cycle_start = cfg.cycle_start_date if cfg and cfg.cycle_start_date else (latest_paycheck.date if latest_paycheck else today_wib)
    cycle_end = cycle_start + timedelta(days=cycle_days - 1)
    days_passed = (today_wib - cycle_start).days + 1
    day_of_cycle = min(cycle_days, max(1, days_passed))
    days_remaining = max(1, cycle_days - day_of_cycle + 1)

    pocket_income_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("inc")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.account == pocket_account,
        Transaction.type == "income",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_budget = int(pocket_income_row.inc) if pocket_income_row and pocket_income_row.inc > 0 else (cfg.total_salary if cfg else 825000)

    spent_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("spent")
    ).filter(
        Transaction.user_id == user_id,
        Transaction.account == pocket_account,
        Transaction.type == "expense",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_spent = int(spent_row.spent if spent_row else 0)
    pocket_remaining = max(0, pocket_budget - pocket_spent)
    safe_daily = int(pocket_remaining / days_remaining)

    accounts = db.query(
        Transaction.account,
        func.sum(
            case((Transaction.type.in_(["income", "transfer_in"]), Transaction.amount), else_=-Transaction.amount)
        ).label("balance")
    ).filter(
        Transaction.user_id == user_id
    ).group_by(Transaction.account).all()

    filename = f"Siklus_{cycle_start}_sd_{cycle_end}.md"
    file_path = os.path.join(finance_dir, filename)

    doc = f"""---
type: finance-cycle
cycle_start: {cycle_start}
cycle_end: {cycle_end}
budget: "{pocket_budget}"
spent: "{pocket_spent}"
remaining: "{pocket_remaining}"
updated_at: "{now_wib.strftime('%Y-%m-%d %H:%M:%S WIB')}"
tags: [finance, cycle-snapshot, mandiri, pacing]
---

# 🏛️ Laporan Siklus Keuangan: {cycle_start} s/d {cycle_end}

> Diekspor secara otomatis oleh **AI7.Steward** pada {now_wib.strftime('%d %B %Y, %H:%M WIB')}.

## 🎯 Ringkasan Pacing Kantong ({pocket_account})
- **Hari Siklus:** H-{day_of_cycle}/{cycle_days} ({days_remaining} hari tersisa)
- **Alokasi Budget Kantong:** {format_rp(pocket_budget)}
- **Total Belanja Terpakai:** {format_rp(pocket_spent)}
- **Sisa Budget Siklus:** {format_rp(pocket_remaining)}
- **Safe-to-Spend Harian:** {format_rp(safe_daily)} / hari

---

## 💳 Posisi Saldo Rekening
| Rekening | Estimasi Saldo |
| --- | --- |
"""
    for a in accounts:
        doc += f"| {a.account} | {format_rp(int(a.balance or 0))} |\n"

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(doc)

    cmd = f'cd "{vault_path}" && git add . && git commit -m "finance: sync cycle snapshot {cycle_start} sd {cycle_end}" && git push origin main'
    os.system(cmd)

    send_message(
        chat_id,
        f"✅ **Snapshot Finansial Berhasil Diekspor ke Obsidian!**\n\n"
        f"📄 File: `SecondBrainAI7/2 Areas/Finance/{filename}`\n"
        f"🔄 Berhasil di-commit dan di-push ke GitHub!\n"
        f"Safe-to-Spend saat ini: **{format_rp(safe_daily)} / hari** 🛡️",
        bot_token=bot_token
    )

def handle_transaksi(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    recent = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(desc(Transaction.id)).limit(5).all()
    if not recent:
        send_message(chat_id, "ℹ️ Belum ada riwayat transaksi.", bot_token=bot_token)
        return

    lines = ["🕒 **5 Transaksi Terakhir:**\n"]
    for t in recent:
        icon = "💰" if t.type == "income" else "💸"
        time_str = t.created_at.astimezone(WIB).strftime("%Y-%m-%d %H:%M") if t.created_at else str(t.date)
        lines.append(f"{icon} **{t.description}** ({t.category})\n   {format_rp(t.amount)} via `{t.account}` • _{time_str}_\n")

    send_message(chat_id, "\n".join(lines), bot_token=bot_token)

def handle_subs(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    from app.models.subscription import Subscription
    from app.api.v1.endpoints.subscriptions import compute_due_info

    subs = db.query(Subscription).filter(Subscription.user_id == user_id, Subscription.is_active == True).all()
    if not subs:
        send_message(chat_id, "ℹ️ Belum ada langganan / tagihan rutin yang aktif.", bot_token=bot_token)
        return

    now_date = datetime.now(WIB).date()
    lines = ["💳 **Daftar Langganan & Tagihan Rutin:**\n"]
    total = 0

    # Sort subs by due date
    def get_sort_key(s):
        days, _ = compute_due_info(s, now_date)
        return days if days is not None else 999

    subs.sort(key=get_sort_key)

    for s in subs:
        total += s.amount
        days_until, next_date = compute_due_info(s, now_date)
        if s.billing_type == "exact_date" and s.exact_due_date:
            if days_until < 0:
                due_str = f"❌ **Expired ({abs(days_until)} hari lalu)**"
            elif days_until == 0:
                due_str = "🚨 **Berakhir HARI INI!**"
            elif days_until <= 3:
                due_str = f"⚠️ Berakhir {days_until} hari lagi (`{next_date}`)"
            else:
                due_str = f"⏳ Berakhir tgl {next_date} ({days_until} hari lagi)"
        else:
            if days_until == 0:
                due_str = "🚨 **Jatuh tempo HARI INI!**"
            elif days_until <= 3:
                due_str = f"⚠️ Jatuh tempo {days_until} hari lagi (`{next_date}`)"
            else:
                due_str = f"🗓️ Tgl {s.billing_day} ({days_until} hari lagi)"

        lines.append(f"• **{s.name}**: {format_rp(s.amount)}/bln\n  └ {due_str} ({s.category})")

    lines.append(f"\n💵 **Total Komitmen Bulanan:** {format_rp(total)}")
    send_message(chat_id, "\n".join(lines), bot_token=bot_token)

def handle_goals(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    from app.models.goal import Goal
    from app.api.v1.endpoints.goals import compute_goal_metrics

    goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.is_active == True).order_by(Goal.id.asc()).all()
    if not goals:
        send_message(chat_id, "🎯 **Belum ada Target Finansial**\n\nBuat target baru via Web Dashboard.", bot_token=bot_token)
        return

    lines = ["🎯 **PROGRESS TARGET & GOALS FINANSIAL**\n"]
    for idx, g in enumerate(goals, 1):
        m = compute_goal_metrics(g, db)
        pct = m["percentage"]
        blocks_filled = min(10, max(0, int(round(pct / 10))))
        bar = "█" * blocks_filled + "░" * (10 - blocks_filled)

        status_line = ""
        if m["remaining_amount"] == 0:
            status_line = "🎉 **Target Tercapai!**"
        elif m["estimated_cycles"] is not None:
            c = m["estimated_cycles"]
            mo = m["estimated_months"]
            target_str = m["estimated_finish_date"].strftime("%d %b %Y") if m["estimated_finish_date"] else ""
            status_line = f"⏳ **Estimasi:** ~{c} siklus gajian lagi (~{mo} bln • {target_str})"

        linked_info = f" • _{m['linked_account']}_" if m.get("linked_account") else ""

        lines.append(
            f"{g.icon} **{g.name}**{linked_info}\n"
            f"   `[{bar}]` **{pct}%**\n"
            f"   • Terkumpul: `{format_rp(m['current_amount'])}` / `{format_rp(m['target_amount'])}`\n"
            f"   • Sisa Target: **{format_rp(m['remaining_amount'])}**\n"
            f"   • {status_line}\n"
        )

    lines.append("💡 _Saldo terupdate otomatis dari mutasi rekening atau dapat disesuaikan di Web Dashboard._")
    send_message(chat_id, "\n".join(lines))

def send_chat_action(chat_id: int, action: str = "typing", bot_token: Optional[str] = None):
    token = bot_token or settings.BOT_TOKEN
    try:
        requests.post(f"https://api.telegram.org/bot{token}/sendChatAction", json={"chat_id": chat_id, "action": action}, timeout=5)
    except Exception:
        pass

def download_telegram_file(file_id: str, bot_token: Optional[str] = None):
    token = bot_token or settings.BOT_TOKEN
    try:
        url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200 and resp.json().get("ok"):
            file_path = resp.json()["result"]["file_path"]
            dl_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
            dl_resp = requests.get(dl_url, timeout=30)
            if dl_resp.status_code == 200:
                return dl_resp.content, file_path
    except Exception as e:
        print(f"Error downloading Telegram file {file_id}: {e}")
    return None, None

def get_acc_balance(acc_name: str, db: Session, user_id: int = 1) -> int:
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
    ).filter(Transaction.user_id == user_id, Transaction.account == acc_name).scalar()
    return int(row or 0)

def normalize_account(raw: str, db: Optional[Session] = None, user_id: int = 1):
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
    if db:
        for acc in db.query(Account).filter(Account.user_id == user_id).all():
            if acc.name.lower() in r or r in acc.name.lower():
                return acc.name
    return raw.strip().title()

def handle_transfer(chat_id: int, text: str, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
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
        send_message(chat_id, guide, bot_token=bot_token)
        return

    pattern = re.compile(r"^(?:/transfer|transfer|tf)\s+([\d\.\,kKrbRB]+)\s+(?:dari\s+)?([a-zA-Z0-9\s]+?)\s+ke\s+([a-zA-Z0-9\s]+?)(?:\s*[:\-]\s*(.*)|\s+(.*))?$", re.IGNORECASE)
    match = pattern.match(clean)
    if not match:
        send_message(chat_id, "⚠️ Format transfer tidak dikenali.\n\nContoh:\n`tf 100k mandiri ke bri 1`\natau ketik `/transfer` untuk panduan lengkap.", bot_token=bot_token)
        return

    amt_str, from_raw, to_raw, desc1, desc2 = match.groups()
    from app.core.parser import parse_amount
    amt, _ = parse_amount(amt_str)
    if not amt or amt <= 0:
        send_message(chat_id, "⚠️ Nominal transfer tidak valid.", bot_token=bot_token)
        return

    from_acc = normalize_account(from_raw, db, user_id=user_id)
    to_acc = normalize_account(to_raw, db, user_id=user_id)

    if not from_acc:
        send_message(chat_id, f"⚠️ Rekening asal `{from_raw}` tidak dikenali.\nPilihan: Mandiri, Jago, BRI 1, BRI 2, Cash.", bot_token=bot_token)
        return
    if not to_acc:
        send_message(chat_id, f"⚠️ Rekening tujuan `{to_raw}` tidak dikenali.\nPilihan: Mandiri, Jago, BRI 1, BRI 2, Cash.", bot_token=bot_token)
        return
    if from_acc == to_acc:
        send_message(chat_id, "⚠️ Rekening asal dan rekening tujuan tidak boleh sama.", bot_token=bot_token)
        return

    desc = (desc1 or desc2 or "Transfer Antar Rekening").strip()
    now_wib = datetime.now(WIB)
    tx_date = now_wib.date()

    tx_out = Transaction(
        user_id=user_id,
        type="transfer_out",
        amount=int(amt),
        account=from_acc,
        category="Transfer",
        description=f"Transfer ke {to_acc}: {desc}",
        raw_text=f"bot transfer: {clean}",
        date=tx_date
    )
    tx_in = Transaction(
        user_id=user_id,
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

    bal_from = get_acc_balance(from_acc, db, user_id=user_id)
    bal_to = get_acc_balance(to_acc, db, user_id=user_id)

    res_msg = f"""🔄 **Transfer Antar Rekening Berhasil!**

💸 **Nominal:** `{format_rp(int(amt))}`
📤 **Dari:** {from_acc} (Sisa Saldo: `{format_rp(bal_from)}`)
📥 **Ke:** {to_acc} (Saldo Baru: `{format_rp(bal_to)}`)
📝 **Keterangan:** {desc}

ℹ️ _Saldo berhasil dipindahkan. Transaksi ini tidak memotong kuota Safe-to-Spend._"""
    send_message(chat_id, res_msg, bot_token=bot_token)

def handle_batal(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    last = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(desc(Transaction.id)).first()
    if not last:
        send_message(chat_id, "⚠️ Tidak ada transaksi yang bisa dibatalkan.", bot_token=bot_token)
        return

    deleted_info = {
        "description": last.description,
        "amount": last.amount,
        "account": last.account,
        "category": last.category
    }

    if last.type == "transfer_in":
        prev = db.query(Transaction).filter(
            Transaction.user_id == user_id,
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
    send_message(chat_id, msg, bot_token=bot_token)

def handle_gajian(chat_id: int, text: str, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    cfg = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == user_id).first()
    cycle_days = cfg.cycle_days if cfg and cfg.cycle_days > 0 else 14
    total = cfg.total_salary if cfg and cfg.total_salary > 0 else 1500000

    parts = text.split()
    if len(parts) > 1:
        from app.core.parser import parse_amount
        parsed_amt, _ = parse_amount(parts[1])
        if parsed_amt and parsed_amt > 0:
            total = int(parsed_amt)

    now = datetime.now(WIB)
    cycle_start = now.date()
    cycle_end = cycle_start + timedelta(days=cycle_days - 1)

    buckets = []
    if cfg:
        buckets = db.query(PaycheckBucket).filter(PaycheckBucket.config_id == cfg.id).order_by(PaycheckBucket.sort_order).all()

    if buckets:
        allocations = []
        allocated_so_far = 0
        for i, b in enumerate(buckets):
            if i == len(buckets) - 1:
                amt = total - allocated_so_far
            else:
                amt = int(round(total * (b.percentage / 100.0)))
                allocated_so_far += amt
            allocations.append((b.account, amt, b.purpose or "Alokasi Pos"))
    else:
        mandiri_amt = int(round(total * 0.55))
        jago_amt = int(round(total * 0.18333333))
        bibit_amt = int(round(total * 0.13333333))
        bri1_amt = int(round(total * 0.06666667))
        bri2_amt = total - (mandiri_amt + jago_amt + bibit_amt + bri1_amt)
        pocket = cfg.pocket_account if cfg and cfg.pocket_account else "Mandiri"
        allocations = [
            (pocket, mandiri_amt, "Pos Belanja Operasional & Kebutuhan Pokok"),
            ("Bank Jago", jago_amt, "Alokasi Langganan & Tagihan Rutin Jago"),
            ("Bibit", bibit_amt, "Alokasi Investasi Reksadana/Saham Bibit"),
            ("BRI 1", bri1_amt, "Alokasi Dana Darurat"),
            ("BRI 2", bri2_amt, "Alokasi Tabungan Kunci"),
        ]

    for acc, amt, desc in allocations:
        tx = Transaction(
            user_id=user_id,
            type="income",
            amount=amt,
            account=acc,
            category="Gajian",
            description=f"Gajian ({desc})",
            raw_text=f"paycheck split /gajian: {total} -> {acc} {amt}",
            date=cycle_start
        )
        db.add(tx)

    db.commit()

    sheet_info = ""
    if user_id == 1:
        try:
            from app.services.sheets_sync import sync_cycle_snapshot
            res = sync_cycle_snapshot(db, cycle_start_date=cycle_start)
            sheet_info = f"\n\n📑 **Google Sheets:** Tab `{res['sheet_title']}` otomatis dibuat & disinkronkan!"
        except Exception as e:
            print(f"Sheets auto-sync error: {e}")

    distrib_lines = []
    for acc, amt, desc in allocations:
        pct = round(amt / total * 100, 1) if total > 0 else 0
        distrib_lines.append(f"• **{acc} ({pct}%):** {format_rp(amt)}\n  └ *{desc}*")
    distrib_str = "\n".join(distrib_lines)

    msg = f"""🎉 **GAJIAN MASUK & ALOKASI OTOMATIS TERCATAT!**

💰 **Total Pemasukan / Gajian:** {format_rp(total)}
📅 **Siklus {cycle_days} Hari:** {cycle_start.strftime('%d %b')} – {cycle_end.strftime('%d %b %Y')}

📊 **Distribusi Alokasi {len(allocations)} Rekening:**
{distrib_str}

🌐 *Gunakan Checklist Interaktif di Web Dashboard:*
[Buka AI7 Finance Web Dashboard]({settings.APP_BASE_URL}){sheet_info}"""

    send_message(chat_id, msg, bot_token=bot_token)

def handle_sheets(chat_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    if user_id != 1:
        send_message(chat_id, "ℹ️ Integrasi Google Sheets dikonfigurasi khusus untuk akun admin utama.", bot_token=bot_token)
        return

    send_message(chat_id, "⏳ _Sedang menyinkronkan data snapshot siklus ke Google Sheets..._", bot_token=bot_token)
    try:
        from app.services.sheets_sync import sync_cycle_snapshot
        res = sync_cycle_snapshot(db)
        msg = f"""📑 **GOOGLE SHEETS DISINKRONKAN!**

• **Tab:** `{res['sheet_title']}`
• **Periode:** `{res['cycle_range']}`
• **Total Transaksi:** `{res['transaction_count']} catatan`
• **Amplop Terpantau:** `{res['envelopes_count']} pos dinamis`
• **Realisasi Belanja:** {format_rp(res['pocket_spent'])} *(Sisa {format_rp(res['pocket_remaining'])})*
• **Total Net Worth:** {format_rp(res['total_balance'])}

🔗 [Buka Lembar Google Sheets]({res['spreadsheet_url']})"""
        send_message(chat_id, msg, bot_token=bot_token)
    except Exception as e:
        send_message(chat_id, f"❌ Gagal sinkronisasi ke Google Sheets: {str(e)}", bot_token=bot_token)

def handle_text_message(chat_id: int, text: str, message_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None, voice_prefix: str = ""):
    user_id = user.id if user else 1
    items = parse_multi_transactions(text)
    if not items:
        # Fall back to single parser to report specific error
        fallback = parse_transaction(text)
        err_msg = fallback.get("error", "Format tidak terdeteksi.")
        send_message(chat_id, f"{voice_prefix}❌ {err_msg}", reply_to_message_id=message_id, bot_token=bot_token)
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
            user_id=user_id,
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

        reply = f"""{voice_prefix}✅ **Tercatat!**

{icon} **{type_label}:** {format_rp(tx.amount)}
📂 **Kategori:** {tx.category}
💳 **Rekening:** {tx.account}
📝 **Keterangan:** {tx.description}
🕒 _{time_str} WIB_"""

        if tx.type == "expense" and tx.account == "Mandiri" and tx.category in MANDIRI_ENVELOPES:
            limit = MANDIRI_ENVELOPES[tx.category]
            spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                Transaction.user_id == user_id,
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
            reply += f"\n\n{get_safe_to_spend_snippet(db, user_id=user_id)}"

        send_message(chat_id, reply, reply_to_message_id=message_id, bot_token=bot_token)
        return

    # If multiple transactions in one message
    created_txs = []
    total_amount = 0
    categories_touched = set()

    for parsed in items:
        tx = Transaction(
            user_id=user_id,
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
                Transaction.user_id == user_id,
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

    lines.append(f"\n{get_safe_to_spend_snippet(db, user_id=user_id)}")

    send_message(chat_id, "\n".join(lines), reply_to_message_id=message_id, bot_token=bot_token)

def handle_media_message(chat_id: int, message: dict, message_id: int, db: Session, user: Optional[User] = None, bot_token: Optional[str] = None):
    user_id = user.id if user else 1
    photo = message.get("photo")
    doc = message.get("document")
    voice = message.get("voice")
    audio = message.get("audio")
    caption = (message.get("caption") or "").strip()

    file_id = None
    media_type = "image"
    mime_type = "image/jpeg"
    action_type = "upload_photo"

    if photo:
        file_id = photo[-1]["file_id"]
        media_type = "image"
        mime_type = "image/jpeg"
        action_type = "upload_photo"
    elif doc:
        mime = (doc.get("mime_type") or "").lower()
        fn = (doc.get("file_name") or "").lower()
        audio_exts = (".mp3", ".m4a", ".wav", ".ogg", ".oga", ".aac", ".flac", ".opus", ".wma", ".caf")
        if mime.startswith("image/") or fn.endswith((".jpg", ".jpeg", ".png", ".webp")):
            file_id = doc["file_id"]
            media_type = "image"
            mime_type = mime or "image/jpeg"
            action_type = "upload_photo"
        elif mime.startswith("audio/") or any(fn.endswith(ext) for ext in audio_exts):
            file_id = doc["file_id"]
            media_type = "audio"
            mime_type = mime or "audio/mp3"
            action_type = "record_voice"
        else:
            send_message(chat_id, "⚠️ Dokumen ini bukan format gambar atau rekaman audio yang didukung.", reply_to_message_id=message_id, bot_token=bot_token)
            return
    elif voice:
        file_id = voice["file_id"]
        media_type = "audio"
        mime_type = voice.get("mime_type") or "audio/ogg"
        action_type = "record_voice"
    elif audio:
        file_id = audio["file_id"]
        media_type = "audio"
        mime_type = audio.get("mime_type") or "audio/mp3"
        action_type = "record_voice"
    else:
        return

    send_chat_action(chat_id, action_type, bot_token=bot_token)
    file_bytes, file_path = download_telegram_file(file_id, bot_token=bot_token)
    if not file_bytes:
        send_message(chat_id, "❌ Gagal mengunduh media dari Telegram. Silakan coba kirim ulang.", reply_to_message_id=message_id, bot_token=bot_token)
        return

    if media_type == "image" and file_path:
        if file_path.lower().endswith(".png"):
            mime_type = "image/png"
        elif file_path.lower().endswith(".webp"):
            mime_type = "image/webp"

    if media_type == "audio":
        try:
            import httpx
            fn = os.path.basename(file_path) if file_path else "audio.ogg"
            resp = httpx.post(
                "http://127.0.0.1:8090/v1/audio/transcriptions",
                files={"file": (fn, file_bytes)},
                data={
                    "language": "id",
                    "prompt": "Mandiri, Bank Jago, Bibit, pengeluaran, pemasukan, transfer, warteg, nasi padang, kopi, indomaret, alfamart"
                },
                timeout=60.0
            )
            if resp.status_code == 200:
                stt_res = resp.json()
                transcribed_text = (stt_res.get("text") or "").strip()
                if transcribed_text:
                    full_text = f"{transcribed_text} ({caption})" if caption else transcribed_text
                    handle_text_message(
                        chat_id=chat_id,
                        text=full_text,
                        message_id=message_id,
                        db=db,
                        user=user,
                        bot_token=bot_token,
                        voice_prefix=f"🎙️ *Suara Terdeteksi:* \"_{transcribed_text}_\"\n\n"
                    )
                    return
        except Exception as e:
            logger.error(f"Whisper STT in finance bot failed: {e}")

    db_accounts = [a.name for a in db.query(Account).filter(Account.user_id == user_id).all()]
    all_accounts = list(set(["Mandiri", "Bank Jago", "Bibit", "BRI 1", "BRI 2"] + db_accounts))

    from app.services.ai_extractor import extract_from_media
    extraction = extract_from_media(
        media_bytes=file_bytes,
        mime_type=mime_type,
        media_type=media_type,
        caption=caption,
        accounts=all_accounts
    )

    if not extraction.get("success"):
        err = extraction.get("error", "Gagal memproses media.")
        send_message(chat_id, f"❌ {err}", reply_to_message_id=message_id, bot_token=bot_token)
        return

    if not extraction.get("detected") or not extraction.get("transactions"):
        reason = extraction.get("transcription") or "Tidak ditemukan rincian nominal pembayaran, struk, atau pengeluaran."
        kind_name = "gambar/struk" if media_type == "image" else "voice note"
        send_message(
            chat_id,
            f"⚠️ **Tidak Terdeteksi Transaksi pada {kind_name}**\n\n_{reason}_\n\n💡 _Tips: Pastikan foto struk/QRIS terang dan terbaca jelas, atau sebutkan nominal dan pengeluaran secara spesifik pada voice note._",
            reply_to_message_id=message_id,
            bot_token=bot_token
        )
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

    tx_list = extraction.get("transactions", [])
    transcription = extraction.get("transcription", "")
    kind = extraction.get("kind", "media")

    if media_type == "image":
        media_header = "🤖📸 **Struk / QRIS Berhasil Dicatat Otomatis!**"
        quote_line = f"🧾 _{transcription}_\n" if transcription else ""
    else:
        media_header = "🤖🎙️ **Voice Note Berhasil Dicatat Otomatis!**"
        quote_line = f"🗣️ _\"{transcription}\"_\n" if transcription else ""

    if len(tx_list) == 1:
        item = tx_list[0]
        tx_type = item.get("type", "expense")

        if tx_type == "transfer":
            from_acc = normalize_account(item.get("from_account", "Mandiri"), db, user_id=user_id) or "Mandiri"
            to_acc = normalize_account(item.get("to_account", "Bibit"), db, user_id=user_id) or "Bibit"
            amt = int(item.get("amount", 0))
            desc = item.get("description", "Transfer Media")

            tx_out = Transaction(
                user_id=user_id,
                type="transfer_out",
                amount=amt,
                account=from_acc,
                category="Transfer",
                description=f"Transfer ke {to_acc}: {desc}",
                raw_text=f"ai media transfer: {kind} {desc}",
                date=now_wib.date()
            )
            tx_in = Transaction(
                user_id=user_id,
                type="transfer_in",
                amount=amt,
                account=to_acc,
                category="Transfer",
                description=f"Transfer dari {from_acc}: {desc}",
                raw_text=f"ai media transfer: {kind} {desc}",
                date=now_wib.date()
            )
            db.add(tx_out)
            db.add(tx_in)
            db.commit()

            bal_from = get_acc_balance(from_acc, db, user_id=user_id)
            bal_to = get_acc_balance(to_acc, db, user_id=user_id)

            reply = f"""{media_header}
{quote_line}
🔄 **Transfer Antar Rekening**

💸 **Nominal:** `{format_rp(amt)}`
📤 **Dari:** {from_acc} (Sisa Saldo: `{format_rp(bal_from)}`)
📥 **Ke:** {to_acc} (Saldo Baru: `{format_rp(bal_to)}`)
📝 **Keterangan:** {desc}
🕒 _{time_str} WIB_

ℹ️ _Saldo berhasil dipindahkan. Transaksi ini tidak memotong kuota Safe-to-Spend._"""
            send_message(chat_id, reply, reply_to_message_id=message_id, bot_token=bot_token)
            return

        amt = int(item.get("amount", 0))
        acc = normalize_account(item.get("account", "Mandiri"), db, user_id=user_id) or "Mandiri"
        cat = item.get("category", "Lain-lain")
        desc = item.get("description", "Pengeluaran Media")

        tx = Transaction(
            user_id=user_id,
            type=tx_type,
            amount=amt,
            account=acc,
            category=cat,
            description=desc,
            raw_text=f"ai media {kind}: {desc} {amt}",
            date=now_wib.date()
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        type_label = "Pemasukan" if tx.type == "income" else "Pengeluaran"
        icon = "💰" if tx.type == "income" else "💸"

        reply = f"""{media_header}
{quote_line}
{icon} **{type_label}:** {format_rp(tx.amount)}
📂 **Kategori:** {tx.category}
💳 **Rekening:** {tx.account}
📝 **Keterangan:** {tx.description}
🕒 _{time_str} WIB_"""

        if tx.type == "expense" and tx.account == "Mandiri" and tx.category in MANDIRI_ENVELOPES:
            limit = MANDIRI_ENVELOPES[tx.category]
            spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                Transaction.user_id == user_id,
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
            reply += f"\n\n{get_safe_to_spend_snippet(db, user_id=user_id)}"

        send_message(chat_id, reply, reply_to_message_id=message_id, bot_token=bot_token)
        return

    # Multiple transactions
    created_txs = []
    total_amount = 0
    categories_touched = set()

    for item in tx_list:
        tx_type = item.get("type", "expense")
        amt = int(item.get("amount", 0))
        acc = normalize_account(item.get("account", "Mandiri"), db, user_id=user_id) or "Mandiri"
        cat = item.get("category", "Lain-lain")
        desc = item.get("description", "Pengeluaran Media")

        tx = Transaction(
            user_id=user_id,
            type=tx_type,
            amount=amt,
            account=acc,
            category=cat,
            description=desc,
            raw_text=f"ai media multi {kind}: {desc} {amt}",
            date=now_wib.date()
        )
        db.add(tx)
        created_txs.append(tx)
        total_amount += amt
        if acc == "Mandiri" and tx_type == "expense":
            categories_touched.add(cat)

    db.commit()
    for tx in created_txs:
        db.refresh(tx)

    lines = [
        media_header,
        quote_line,
        f"✅ **{len(created_txs)} Transaksi Berhasil Dicatat Sekaligus!**\n"
    ]
    for idx, tx in enumerate(created_txs, 1):
        icon = "💰" if tx.type == "income" else "💸"
        lines.append(f"{idx}. {icon} **{format_rp(tx.amount)}** • {tx.description}\n   📂 `{tx.category}` • 💳 `{tx.account}`")

    lines.append(f"\n💵 **Total:** {format_rp(total_amount)}")
    lines.append(f"🕒 _{time_str} WIB_")

    mandiri_status_lines = []
    for cat in categories_touched:
        if cat in MANDIRI_ENVELOPES:
            limit = MANDIRI_ENVELOPES[cat]
            spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                Transaction.user_id == user_id,
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

    lines.append(f"\n{get_safe_to_spend_snippet(db, user_id=user_id)}")

    send_message(chat_id, "\n".join([line for line in lines if line]), reply_to_message_id=message_id, bot_token=bot_token)

def process_update(update: dict, bot_token: Optional[str] = None, user_override: Optional[User] = None):
    message = update.get("message")
    if not message:
        return

    tg_user = message.get("from", {})
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    message_id = message.get("message_id")

    print(f"[{datetime.now()}] Update received: chat_id={chat_id}, user={tg_user.get('username')}, text={text}")

    if not chat_id:
        return

    db = SessionLocal()
    try:
        user = user_override
        if not user:
            # Look up user by telegram_chat_id
            try:
                tg_id_int = int(chat_id)
                user = db.query(User).filter(User.telegram_chat_id == tg_id_int).first()
            except (ValueError, TypeError):
                user = None
            if not user and chat_id == settings.ALLOWED_USER_ID:
                user = db.query(User).filter(User.id == 1).first()

        # If user is not recognized and this is Shared Bot
        if not user:
            lower_text = text.lower()
            unlinked_msg = f"""👋 **Selamat Datang di AI7 Finance Bot!**

🆔 **Chat ID Telegram Kamu:**
`{chat_id}`

📌 **Langkah Menghubungkan Akun:**
1️⃣ Salin Chat ID di atas: `{chat_id}`
2️⃣ Buka [AI7 Finance Web Dashboard]({settings.APP_BASE_URL})
3️⃣ Buka modal **Profil Pengguna** ➔ Tab **Integrasi Telegram**
4️⃣ Pilih mode **Shared Bot** dan tempelkan Chat ID kamu
5️⃣ Klik **Hubungkan Telegram**

Setelah terhubung, kamu bisa langsung mencatat pengeluaran, struk kasir, QRIS, dan voice note di sini! 🚀"""
            send_message(chat_id, unlinked_msg, bot_token=bot_token)
            return

        has_media = bool(message.get("photo") or message.get("voice") or message.get("audio") or message.get("document"))

        if has_media:
            handle_media_message(chat_id, message, message_id, db, user=user, bot_token=bot_token)
            return

        if not text:
            return

        lower_text = text.lower()
        cmd = text.split()[0].lower()
        if lower_text in ["📊 rekap", "rekap"]:
            handle_rekap(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["💳 saldo", "saldo"]:
            handle_saldo(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["🎯 target & goals", "🎯 target", "target", "goals", "milestone"] or cmd in ["/goals", "/target", "/milestone"]:
            handle_goals(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["🔔 tagihan / subs", "tagihan", "subs"]:
            handle_subs(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["📜 transaksi", "transaksi", "history"]:
            handle_transaksi(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["💰 info gajian"]:
            handle_gajian(chat_id, "/gajian", db, user=user, bot_token=bot_token)
        elif lower_text in ["📑 google sheets", "google sheets", "sheets"] or cmd in ["/sheets", "/sheet", "/sync_sheets"]:
            handle_sheets(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["🌐 web dashboard", "dashboard", "web"] or cmd in ["/web", "/dashboard"]:
            send_dashboard_link(chat_id, bot_token=bot_token)
        elif lower_text in ["📱 menu", "menu"] or cmd in ["/menu"]:
            handle_menu(chat_id, bot_token=bot_token)
        elif lower_text in ["🔄 transfer", "transfer", "tf"] or cmd in ["/transfer", "/tf"] or lower_text.startswith("transfer ") or lower_text.startswith("tf "):
            handle_transfer(chat_id, text, db, user=user, bot_token=bot_token)
        elif cmd in ["/start", "/help"]:
            handle_start(chat_id, user=user, bot_token=bot_token)
        elif cmd in ["/gajian"]:
            handle_gajian(chat_id, text, db, user=user, bot_token=bot_token)
        elif cmd in ["/transfer", "🔄 transfer"]:
            handle_transfer(chat_id, text, db, user=user, bot_token=bot_token)
        elif cmd in ["/rekap", "/bulan"]:
            handle_rekap(chat_id, db, user=user, bot_token=bot_token)
        elif cmd in ["/saldo"]:
            handle_saldo(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["🎯 pacing", "pacing", "pace"] or cmd in ["/pacing", "/pace", "/status"]:
            handle_pacing(chat_id, db, user=user, bot_token=bot_token)
        elif lower_text in ["📓 obsidian", "obsidian"] or cmd in ["/obsidian", "/export"]:
            handle_obsidian(chat_id, db, user=user, bot_token=bot_token)
        elif cmd in ["/transaksi", "/history"]:
            handle_transaksi(chat_id, db, user=user, bot_token=bot_token)
        elif cmd in ["/batal", "/undo", "/hapus"]:
            handle_batal(chat_id, db, user=user, bot_token=bot_token)
        elif cmd in ["/subs", "/langganan", "/tagihan"]:
            handle_subs(chat_id, db, user=user, bot_token=bot_token)
        else:
            handle_text_message(chat_id, text, message_id, db, user=user, bot_token=bot_token)
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
