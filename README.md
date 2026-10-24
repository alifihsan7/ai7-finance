# ai7.finance 💸

> **Production-ready, multi-tenant personal finance ecosystem** engineered for friction-free daily expense capture via Telegram and deep analytical budgeting via a modern dark-themed web dashboard.
>
> 🌐 **Live Production:** [ai7finance.alifihsan.my.id](https://ai7finance.alifihsan.my.id)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Highlights

- **⚡ Zero-Friction Telegram Capture:** Log expenses in under a second using regex natural language parsing (`kopi 25k bca`, `bensin 50rb cash`, `gaji 5jt`).
- **📱 Telegram Mini App (TMA):** Access the entire Next.js financial dashboard natively within Telegram via the persistent "📊 Dashboard" menu button, featuring zero-click cryptographic auto-login (HMAC-SHA256 Single Sign-On).
- **🔐 Multi-Tenant Architecture:** Built from the ground up with secure user isolation, Argon2/Bcrypt password hashing, JWT bearer tokens, and Google OAuth 2.0 Sign-In.
- **🤖 Dual-Mode Telegram Engine:**
  - **Shared Bot Mode:** One central companion bot securely routes transactions to users based on verified Telegram IDs.
  - **BYOB (Bring Your Own Bot):** Users can link their own private Telegram bot token directly from their profile settings.
- **🔄 Dynamic Budget Cycles:** Flexible budget periods tailored to your actual paycheck cycle—**Weekly (7 Days)**, **Bi-Weekly (14 Days)**, or **Monthly (30 Days)**—with automated cycle rollover and historical tracking.
- **📉 Burn-Rate Trajectory & Pacing:** Real-time safe-to-spend velocity meter (`Rp/hari`), pacing status indicators (🟢 Pace Aman vs 🔴 Agak Boros), and ideal cumulative pace lines.
- **📦 Envelope Budgeting (Strata Allocation):** Dynamic percentage-based distribution across customizable buckets (Operational Saku, Fixed Bills, Investments, Emergency Reserve) connected directly to live account balances.
- **🧾 AI Receipt & Voice Extractor:** Optional multimodal integration with OpenAI-compatible vision/audio models to ingest physical paper receipts and Telegram voice notes.
- **💻 Responsive Slate Dark UI:** PWA-ready dashboard styled in slate dark tones, custom React Portal dropdowns (`CustomSelect`), and currency formatting (`CurrencyInput`).

---

## 📚 Dokumentasi & Buku Panduan

- 🏛️ **[Spesifikasi Arsitektur Sistem (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)** — Penjelasan mendalam mengenai isolasi multi-tenant, ERD database PostgreSQL, formula matematika *Safe-to-Spend* dan burn-rate trajectory, spesifikasi engine parser regex, verifikasi kriptografis Telegram Mini App, serta katalog REST API lengkap.
- 🚀 **[Panduan Production Deployment (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md)** — Panduan operasi server Linux 24/7 dengan systemd services, setup PostgreSQL, environment variables, reverse proxy, dan konfigurasi Google OAuth 2.0.
- 📕 **[Buku Panduan Pengguna PDF (docs/Panduan_Pengguna_AI7_Finance.pdf)](docs/Panduan_Pengguna_AI7_Finance.pdf)** — E-book panduan praktis 8 halaman (format A4) siap cetak/baca untuk pengguna baru: panduan onboarding dashboard, integrasi Telegram Mini App, menghubungkan Telegram bot (Shared/BYOB), tabel sintaks input cepat, dan FAQ troubleshooting.

---

## 🏗️ System Architecture

```text
               +-------------------------------------------------------------+
               |                       Telegram Clients                      |
               |  (Voice Notes, Photos/Receipts, Text Tx, Telegram Mini App) |
               +------------------------------+------------------------------+
                                              |
                                              v
                                +---------------------------+
                                |    Telegram Bot Engine    |
                                |    (Shared Bot / BYOB)    |
                                +-------------+-------------+
                                              |
                                              v
+-----------------------+      +-------------------------------+      +-----------------------+
|   Next.js 14 Client   |<---->|      FastAPI REST Server      |<---->|   PostgreSQL RDBMS    |
| (TMA & Web Dashboard) |      |  (/api/v1/ auth, tx, summary) |      | (ACID Multi-Tenant DB)|
+-----------------------+      +---------------+---------------+      +-----------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Background Cron Services   |
                              |  (Pacing Watchdog, Sub Alert) |
                              +-------------------------------+
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **PostgreSQL 14+**
- (Optional) Telegram Bot token from [@BotFather](https://t.me/BotFather)

---

### 1. Clone & Set Up Python Environment

```bash
git clone https://github.com/alifihsan7/ai7-finance.git
cd ai7-finance

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

---

### 2. Configure Environment Variables

```bash
cp .env.example backend/.env
```

Open `backend/.env` and update the required keys:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai7_finance

# JWT secret (generate one with: openssl rand -hex 32)
JWT_SECRET_KEY=your_generated_32_char_secret_key

# Telegram Bot Token (Optional if using web-only mode)
BOT_TOKEN=your_bot_token_from_botfather

# Local Timezone
TIMEZONE=Asia/Jakarta
```

---

### 3. Build Web Dashboard Frontend

```bash
cd frontend
npm install
npm run build
cd ..

# Sync static build to web server root
rm -rf static/*
cp -r frontend/out/* static/
cp frontend/public/manifest.json static/
```

---

### 4. Run Services

#### Starting the Web API & Dashboard
```bash
./run_web.sh
# Server starts at http://localhost:8080
```

#### Starting the Telegram Bot
```bash
./run_bot.sh
```

---

## 💬 Telegram Bot Quick Ingestion Syntax

The bot parses natural language strings instantly with zero LLM token costs:

| User Input | Type | Amount | Account | Category | Description |
|---|---|---|---|---|---|
| `kopi 25k bca` | Expense | Rp 25.000 | BCA | Jajan / Ngopi | Kopi |
| `makan siang 35rb mandiri` | Expense | Rp 35.000 | Mandiri | Makanan & Minuman | Makan siang |
| `bensin 50000 cash` | Expense | Rp 50.000 | Cash | Transportasi | Bensin |
| `gaji 5000000 mandiri` | Income | Rp 5.000.000 | Mandiri | Gaji & Pendapatan | Gaji |
| `tf 100k mandiri ke jago` | Transfer | Rp 100.000 | Mandiri -> Jago | Transfer Saldo | Pindah dana |

### Supported Bot Commands
- `/start` — Check authorization or link Telegram account with a 6-digit sync code from the web.
- `/balance` — View real-time wallet balances across all registered accounts.
- `/cycle` — View safe-to-spend pacing and days remaining in the active paycheck cycle.
- `/report` — Get a summary of current period income, expenses, and savings rate.
- `/help` — Display syntax examples and usage guide.

---

## 🛠️ Production Deployment

Untuk panduan deployment langkah-demi-langkah di server Linux (Ubuntu/Debian), konfigurasi database PostgreSQL, environment variables, reverse proxy, dan konfigurasi Google OAuth 2.0, silakan pelajari dokumen terpisah:

👉 **[Panduan Production Deployment (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md)**

Ringkasan cepat operasi 24/7 di server Linux:
1. **Layanan Background:** Dikelola melalui unit systemd `ai7-finance-web.service` (FastAPI backend & web dashboard di port 8080) dan `ai7-finance.service` (Telegram companion bot).
2. **Reverse Proxy & SSL:** Menggunakan reverse proxy standar (seperti Nginx atau Caddy) untuk meneruskan lalu lintas HTTPS (port 443) ke backend lokal (`http://127.0.0.1:8080`).
3. **Autentikasi Google:** Daftarkan origin domain publik di Google Cloud Console (*Authorized JavaScript origins* & *Authorized redirect URIs*).

---

## 🔒 Security & Privacy

- **SQL Injection Prevention:** 100% parametrized queries via SQLAlchemy ORM.
- **Stateless Bearer Tokens:** HS256 JWT tokens with configurable TTL.
- **Tenant Data Isolation:** Every query explicitly scopes by authenticated `user_id`.
- **Zero Secrets in Repository:** Credentials, `.env`, tokens, and service account JSONs are strictly gitignored.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
