# AI7 Finance 💸

A personal finance tracking ecosystem designed for high-efficiency input on mobile via Telegram and comprehensive analytics on laptop/tablet via a responsive Web Dashboard.

## Key Features

- **Sub-second Telegram Ingestion:** Natural language & regex parser that extracts amount, category, account, and description with zero LLM latency and zero token cost.
  - *Examples:* `kopi 25k bca`, `bensin 50rb cash`, `gaji 10jt bca`, `beli baju 150k ovo`.
- **FastAPI Web Dashboard:** Modern dark-themed dashboard built with Tailwind CSS, Lucide icons, and Chart.js.
  - KPI Stat Cards: Net Total Balance, Monthly Income, Monthly Expense, Net Cashflow, Savings Rate.
  - Interactive charts: Donut breakdown by category + daily cashflow bars.
  - Wallets / Accounts overview (BCA, Mandiri, Jago, GoPay, OVO, Cash, etc.).
  - Searchable, filterable transactions table with instant deletion & CSV export.
- **Privacy & Security:** Whitelisted by Telegram User ID. Secrets and SQLite database are isolated.
- **Always-on Architecture:** Managed via systemd background services (`ai7-finance.service` and `ai7-finance-web.service`).

## Tech Stack

- **Backend & Ingestion:** Python 3, FastAPI, Uvicorn, SQLite
- **Bot Layer:** Telegram Bot API
- **Frontend:** HTML5, Tailwind CSS, Chart.js, Lucide Icons
- **Deployment:** Linux systemd services + Tailscale HTTPS

## Getting Started

1. Clone repository:
   ```bash
   git clone https://github.com/alifihsan7/ai7-finance.git
   cd ai7-finance
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your BOT_TOKEN and ALLOWED_USER_ID
   ```
4. Run the services:
   ```bash
   # Telegram Bot
   python3 bot.py

   # Web Dashboard
   python3 -m uvicorn web:app --host 0.0.0.0 --port 8080
   ```
