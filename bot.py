import os
import sys
import time
import requests
from datetime import datetime
import zoneinfo

from parser import parse_transaction
import db

# Load env variables manually to avoid extra dependencies
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(ENV_PATH):
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

BOT_TOKEN = os.environ.get("BOT_TOKEN")
ALLOWED_USER_ID = int(os.environ.get("ALLOWED_USER_ID", "1357550611"))

if not BOT_TOKEN:
    print("ERROR: BOT_TOKEN is not set.")
    sys.exit(1)

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"
WIB = zoneinfo.ZoneInfo("Asia/Jakarta")

def format_rp(amount: int) -> str:
    return f"Rp {amount:,}".replace(",", ".")

def send_message(chat_id: int, text: str, parse_mode: str = "Markdown", reply_to_message_id: int = None):
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

Bot ini dirancang khusus untuk mencatat keuangan lo secara instan tanpa ribet.

💡 **Contoh Input Cepat:**
• `kopi 25k bca`
• `bensin 50rb cash`
• `makan siang 35.000 gopay`
• `gaji 10jt bca`
• `beli baju 150k ovo`
• `bayar wifi indihome 350rb mandiri`

📌 **Perintah Tersedia:**
• `/rekap` - Ringkasan pengeluaran bulan ini
• `/saldo` - Estimasi saldo per rekening
• `/transaksi` - 5 transaksi terakhir
• `/batal` - Hapus/batalkan input terakhir jika salah

Tinggal ketik catatan pengeluaran/pemasukan lo kapan saja!"""
    send_message(chat_id, msg)

def handle_rekap(chat_id: int):
    now = datetime.now(WIB)
    month_names = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    summary = db.get_monthly_summary(now.year, now.month)
    month_name = month_names[now.month]

    lines = [
        f"📊 **Rekap Keuangan - {month_name} {now.year}**\n",
        f"💰 **Total Pemasukan:** {format_rp(summary['income'])}",
        f"💸 **Total Pengeluaran:** {format_rp(summary['expense'])}",
        f"📈 **Net Cashflow:** {format_rp(summary['net'])}\n",
        "📂 **Rincian Pengeluaran per Kategori:**"
    ]

    if not summary["categories"]:
        lines.append("_Belum ada pengeluaran yang tercatat bulan ini._")
    else:
        for cat in summary["categories"]:
            lines.append(f"• **{cat['category']}**: {format_rp(cat['total'])} ({cat['count']}x)")

    send_message(chat_id, "\n".join(lines))

def handle_saldo(chat_id: int):
    balances = db.get_balances()
    if not balances:
        send_message(chat_id, "ℹ️ Belum ada data transaksi untuk menghitung saldo.")
        return

    lines = ["💳 **Estimasi Saldo per Rekening:**\n"]
    total = 0
    for b in balances:
        bal = b["balance"] or 0
        total += bal
        lines.append(f"• **{b['account']}**: {format_rp(bal)}")

    lines.append(f"\n💵 **Total Keseluruhan:** {format_rp(total)}")
    send_message(chat_id, "\n".join(lines))

def handle_transaksi(chat_id: int):
    recent = db.get_recent_transactions(5)
    if not recent:
        send_message(chat_id, "ℹ️ Belum ada riwayat transaksi.")
        return

    lines = ["🕒 **5 Transaksi Terakhir:**\n"]
    for t in recent:
        icon = "💰" if t["type"] == "income" else "💸"
        lines.append(f"{icon} **{t['description']}** ({t['category']})\n   {format_rp(t['amount'])} via `{t['account']}` • _{t['created_at']}_\n")

    send_message(chat_id, "\n".join(lines))

def handle_batal(chat_id: int):
    deleted = db.delete_last_transaction()
    if not deleted:
        send_message(chat_id, "⚠️ Tidak ada transaksi yang bisa dibatalkan.")
        return

    msg = f"""🗑️ **Transaksi Terakhir Dibatalkan!**

• **Deskripsi:** {deleted['description']}
• **Nominal:** {format_rp(deleted['amount'])}
• **Rekening:** {deleted['account']}
• **Kategori:** {deleted['category']}

Catatan tersebut sudah dihapus dari database."""
    send_message(chat_id, msg)

def handle_text_message(chat_id: int, text: str, message_id: int):
    parsed = parse_transaction(text)
    if not parsed["success"]:
        send_message(
            chat_id, 
            f"❌ {parsed['error']}",
            reply_to_message_id=message_id
        )
        return

    saved = db.add_transaction(parsed)
    type_label = "Pemasukan" if saved["type"] == "income" else "Pengeluaran"
    icon = "💰" if saved["type"] == "income" else "💸"

    reply = f"""✅ **Tercatat!**

{icon} **{type_label}:** {format_rp(saved['amount'])}
📂 **Kategori:** {saved['category']}
💳 **Rekening:** {saved['account']}
📝 **Keterangan:** {saved['description']}
🕒 _{saved['created_at']} WIB_"""

    send_message(chat_id, reply, reply_to_message_id=message_id)

def process_update(update: dict):
    message = update.get("message")
    if not message:
        return

    user = message.get("from", {})
    user_id = user.get("id")
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    message_id = message.get("message_id")

    # Strict whitelist check
    if user_id != ALLOWED_USER_ID:
        print(f"Blocked unauthorized user: {user_id} ({user.get('username')})")
        send_message(chat_id, "⛔ Akses ditolak. Bot ini bersifat privat.")
        return

    if not text:
        return

    cmd = text.split()[0].lower()
    if cmd in ["/start", "/help"]:
        handle_start(chat_id)
    elif cmd in ["/rekap", "/bulan"]:
        handle_rekap(chat_id)
    elif cmd in ["/saldo"]:
        handle_saldo(chat_id)
    elif cmd in ["/transaksi", "/history"]:
        handle_transaksi(chat_id)
    elif cmd in ["/batal", "/undo", "/hapus"]:
        handle_batal(chat_id)
    else:
        handle_text_message(chat_id, text, message_id)

def main():
    print("Initializing AI7 Finance DB...")
    db.init_db()
    print("AI7 Finance Bot started listening for updates...")

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
                print(f"Non-200 getUpdates status: {resp.status_code}")
                time.sleep(2)
        except requests.exceptions.Timeout:
            continue
        except requests.exceptions.RequestException as e:
            print(f"Network error: {e}")
            time.sleep(3)
        except Exception as e:
            print(f"Unexpected error in loop: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
