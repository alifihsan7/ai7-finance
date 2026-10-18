# ai7.finance 💸

> **Production-ready, multi-tenant personal finance ecosystem** engineered for friction-free daily expense capture via Telegram and deep analytical budgeting via a modern dark-themed web dashboard.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Highlights

- **⚡ Zero-Friction Telegram Capture:** Log expenses in under a second using regex natural language parsing (`kopi 25k bca`, `bensin 50rb cash`, `gaji 5jt`).
- **🔐 Multi-Tenant Architecture:** Built from the ground up with secure user isolation, Argon2/Bcrypt password hashing, JWT bearer tokens, and Google OAuth 2.0 Sign-In.
- **🤖 Dual-Mode Telegram Engine:**
  - **Shared Bot Mode:** One central companion bot securely routes transactions to users based on verified Telegram IDs.
  - **BYOB (Bring Your Own Bot):** Users can link their own private Telegram bot token directly from their profile settings.
- **🔄 Dynamic Budget Cycles:** Flexible budget periods tailored to your actual paycheck cycle—**Weekly (7 Days)**, **Bi-Weekly (14 Days)**, or **Monthly (30 Days)**—with automated cycle rollover and historical tracking.
- **📉 Burn-Rate Trajectory & Pacing:** Real-time safe-to-spend velocity meter (`Rp/hari`), pacing status indicators (🟢 Pace Aman vs 🔴 Agak Boros), and ideal cumulative pace lines.
- **📦 Envelope Budgeting (Strata Allocation):** Dynamic percentage-based distribution across customizable buckets (Operational Saku, Fixed Bills, Investments, Emergency Reserve).
- **🧾 AI Receipt & Voice Extractor:** Optional multimodal integration with OpenAI-compatible vision/audio models to ingest physical paper receipts and Telegram voice notes.
- **📱 Responsive Slate Dark UI:** PWA-ready dashboard styled in slate dark tones, custom React Portal dropdowns (`CustomSelect`), and currency formatting (`CurrencyInput`).

---

## 🏗️ System Architecture

```text
               +-------------------------------------------+
               |             Telegram Clients              |
               |  (Voice Notes, Photos/Receipts, Text Tx)  |
               +---------------------+---------------------+
                                     |
                                     v
                       +---------------------------+
                       |    Telegram Bot Engine    |
                       |    (Shared Bot / BYOB)    |
                       +-------------+-------------+
                                     |
                                     v
+-----------------------+     +-------------------------------+     +-----------------------+
|   Next.js 14 Client   |<--->|      FastAPI REST Server      |<--->|   PostgreSQL RDBMS    |
| (React / Tailwind UI) |     |  (/api/v1/ auth, tx, summary) |     | (ACID Multi-Tenant DB)|
+-----------------------+     +---------------+---------------+     +-----------------------+
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

## 🛠️ Production Deployment (Linux Systemd)

For 24/7 background operation on Ubuntu/Debian servers:

### 1. Web Service (`/etc/systemd/system/ai7-finance-web.service`)
```ini
[Unit]
Description=AI7 Finance Web Dashboard
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ai7-finance
ExecStart=/path/to/ai7-finance/run_web.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 2. Bot Service (`/etc/systemd/system/ai7-finance.service`)
```ini
[Unit]
Description=AI7 Finance Telegram Companion Bot
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ai7-finance
ExecStart=/path/to/ai7-finance/run_bot.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai7-finance-web.service ai7-finance.service
```

---

## 🔒 Security & Privacy

- **SQL Injection Prevention:** 100% parametrized queries via SQLAlchemy ORM.
- **Stateless Bearer Tokens:** HS256 JWT tokens with configurable TTL.
- **Tenant Data Isolation:** Every query explicitly scopes by authenticated `user_id`.
- **Zero Secrets in Repository:** Credentials, `.env`, tokens, and service account JSONs are strictly gitignored.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
