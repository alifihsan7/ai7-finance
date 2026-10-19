# AI7 Finance — System Architecture & Technical Specifications

> **Multi-Tenant Personal Finance Engine** engineered for sub-second expense ingestion via Telegram and deep analytical budgeting through a Next.js 14 dashboard.

---

## 1. High-Level Architecture Overview

AI7 Finance employs a decoupled, modular architecture designed for high availability, low latency, and strict user data isolation.

```text
                               +-------------------------------------------------------------+
                               |                       Telegram Clients                      |
                               |  - Natural Language Strings                                 |
                               |  - Voice Notes (OGG/Opus) & Receipt Photos                  |
                               |  - Telegram Mini App (TWA In-App Web View)                  |
                               +------------------------------+------------------------------+
                                                              |
                                                              v
                                                +---------------------------+
                                                |    Telegram Bot Engine    |
                                                |  - Shared Bot (@AI7Fin4nc3_bot)
                                                |  - BYOB (Bring Your Own Bot)
                                                |  - Persistent Menu Button |
                                                +-------------+-------------+
                                                              |
                                                              v
+-----------------------+                       +---------------------------+                       +-----------------------+
|   Next.js 14 Client   | <-------------------> |    FastAPI REST Engine    | <-------------------> |   PostgreSQL 14+ DB   |
| - React 18, Tailwind  |         HTTPS         | - JWT Auth & Bearer Guard |          SQL          | - Multi-tenant schema |
| - Telegram WebApp SDK |     REST + initData   | - TMA HMAC-SHA256 Auth    |        Pool: 20       | - ACID transactions   |
| - Slate Dark Theme    |                       | - Pacing & Burn-Rate Math |                       | - Strict Foreign Keys |
+-----------------------+                       +-------------+-------------+                       +-----------------------+
                                                              |
                                                              v
                                                +---------------------------+
                                                |  Automated Cron Services  |
                                                | - Daily 08:00 Server Digest
                                                | - Daily 09:00 Sub Alert   |
                                                | - Daily 21:00 Pacing Eval |
                                                +---------------------------+
```

---

## 2. Multi-Tenant Isolation & Security Model

### 2.1 Identity & Authorization
- **Tenant Isolation:** Every primary database table (`transactions`, `accounts`, `paycheck_configs`, `paycheck_buckets`, `goals`, `subscriptions`, `cycle_history`) includes a foreign key constraint referencing `users.id`.
- **JWT Authentication:** Stateless HS256 tokens carry the user claims (`sub=user_id`, `email`, `exp`). Tokens expire in 30 days (`ACCESS_TOKEN_EXPIRE_MINUTES=43200`).
- **Strict Dependency Injection:** In FastAPI, endpoints enforce user context via `get_strict_current_user` dependency:
  ```python
  def get_strict_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
      # Validates signature, expiration, and ensures user exists and is_active in DB
  ```

### 2.2 Dual-Mode Telegram Architecture
1. **Shared Companion Bot Mode (`telegram_mode = "shared"`):**
   - The central bot (`@AI7Fin4nc3_bot`) receives updates via long-polling (`getUpdates`).
   - The update's `chat_id` (Telegram User ID) is matched against `users.telegram_chat_id` (`BIGINT`).
   - If recognized, the transaction is automatically scoped to that `user_id`.
   - If unrecognized, the bot replies with onboarding instructions displaying the user's Telegram Chat ID to pair with the web dashboard.
2. **BYOB (Bring Your Own Bot) Mode (`telegram_mode = "custom"`):**
   - Users can provide their own bot token from `@BotFather` in their dashboard profile.
   - The platform registers an exclusive webhook endpoint (`/api/v1/auth/telegram/webhook/{secret}`) dedicated exclusively to that user.

### 2.3 Telegram Mini App (TMA) Architecture & Cryptographic Verification
AI7 Finance provides a native in-app dashboard experience directly inside Telegram via Telegram WebApp (TMA):
1. **Persistent Access:**
   - Configured via Telegram Bot API `setChatMenuButton` as a fixed `web_app` button labeled `"📊 Dashboard"` positioned alongside the chat input bar.
2. **Cryptographic Zero-Click SSO:**
   - The frontend passes `window.Telegram.WebApp.initData` to `/api/v1/auth/telegram-webapp`.
   - The backend validates authenticity without passwords via HMAC-SHA256:
     $$\text{secret\_key} = \text{HMAC-SHA256}(\text{key} = \text{"WebAppData"}, \text{data} = \text{BOT\_TOKEN})$$
     $$\text{data\_check\_string} = \text{join}(\text{sort}(\{ k = v \mid k \neq \text{"hash"} \}), \text{"\\n"})$$
     $$\text{computed\_hash} = \text{HMAC-SHA256}(\text{key} = \text{secret\_key}, \text{data} = \text{data\_check\_string})$$
   - Matches `computed_hash == received_hash` and asserts `auth_date` is not older than 7 days to eliminate replay attacks.
   - Once verified, the user is authenticated instantly and issued a JWT token.
3. **Viewport & Native Slate Theme Synchronization:**
   - Calls `tg.ready()` and `tg.expand()` on load for maximum vertical view.
   - Sets `setHeaderColor("#0B0D11")` and `setBackgroundColor("#0B0D11")` so the native Telegram chrome seamlessly matches the dashboard theme.

---

## 3. Data Model (Entity Relationship Diagram)

```text
               +----------------------------------+
               |              users               |
               +----------------------------------+
               | id (PK, BigInt)                  |
               | email (VARCHAR, Unique)          |
               | hashed_password (VARCHAR)        |
               | telegram_chat_id (BIGINT, Unique)|
               | telegram_mode (shared/custom)    |
               | telegram_bot_token (VARCHAR)     |
               +----------------+-----------------+
                                |
      +-------------------------+-------------------------+
      | 1:N                     | 1:N                     | 1:1
      v                         v                         v
+------------------+      +------------------+      +--------------------+
|   transactions   |      |     accounts     |      |  paycheck_configs  |
+------------------+      +------------------+      +--------------------+
| id (PK)          |      | id (PK)          |      | id (PK)            |
| user_id (FK)     |      | user_id (FK)     |      | user_id (FK)       |
| type (inc/exp/tf)|      | name (VARCHAR)   |      | cycle_days (7/14/30|
| amount (INT)     |      | type (bank/cash) |      | cycle_start_date   |
| account (VARCHAR)|      | balance (INT)    |      | total_salary (INT) |
| category(VARCHAR)|      | is_active (BOOL) |      | pocket_account     |
| date (DATE)      |      +------------------+      +---------+----------+
| description      |                                          |
+------------------+                                          | 1:N
                                                              v
+------------------+      +------------------+      +--------------------+
|      goals       |      |  subscriptions   |      |  paycheck_buckets  |
+------------------+      +------------------+      +--------------------+
| id (PK)          |      | id (PK)          |      | id (PK)            |
| user_id (FK)     |      | user_id (FK)     |      | config_id (FK)     |
| title (VARCHAR)  |      | name (VARCHAR)   |      | name (VARCHAR)     |
| target_amount    |      | amount (INT)     |      | percentage (FLOAT) |
| current_amount   |      | billing_date     |      | target_account     |
| target_date      |      | account (VARCHAR)|      +--------------------+
+------------------+      +------------------+
```

---

## 4. Dynamic Budget Cycle & Pacing Engine

AI7 Finance rejects rigid monthly calendar restrictions in favor of **Paycheck-Aligned Rolling Cycles**.

### 4.1 Cycle Time Parameters
- **Anchor:** `cycle_start_date` (explicitly set by the user or dynamically inferred from the latest income transaction categorized as Paycheck).
- **Duration ($D$):** Configured as 7 (Weekly), 14 (Bi-Weekly), or 30 (Monthly) days.
- **Cycle Range:** $[ \text{start\_date}, \text{start\_date} + (D - 1) ]$.
- **Days Passed ($d$):** $\max(1, \min(D, (\text{today} - \text{start\_date}).\text{days} + 1))$.
- **Days Remaining ($r$):** $\max(1, D - d + 1)$.

### 4.2 Safe-to-Spend Velocity & Burn-Rate Math
Let:
- $B_{\text{pocket}}$ = Total budget allocated to the primary operational spending account (e.g., Saku Belanja) for the cycle.
- $S_{\text{spent}}$ = Total cumulative expenses charged to the operational spending account within the current cycle window.
- $R_{\text{rem}}$ = Remaining spending quota = $\max(0, B_{\text{pocket}} - S_{\text{spent}})$.

The velocity metrics are derived as follows:

$$\text{Safe-to-Spend Daily} = \left\lfloor \frac{R_{\text{rem}}}{r} \right\rfloor$$

$$\text{Ideal Daily Rate} = \frac{B_{\text{pocket}}}{D}$$

$$\text{Ideal Cumulative Pace Today} = \lfloor \text{Ideal Daily Rate} \times d \rfloor$$

**Pacing Status Logic:**
- If $S_{\text{spent}} \le \text{Ideal Cumulative Pace Today}$: 🟢 **Pace Aman** (Under or on budget pace).
- If $S_{\text{spent}} > \text{Ideal Cumulative Pace Today}$: 🔴 **Agak Boros** (Spending trajectory exceeds the uniform burn rate).

---

## 5. Regex Natural Language Parser Engine

Located in `backend/app/core/parser.py`, the parsing engine evaluates single and multi-line user messages without invoking expensive LLM tokens:

1. **Amount Normalization:**
   - Multipliers: `k` / `rb` $\to \times 1.000$, `jt` / `m` $\to \times 1.000.000$.
   - Formats handled: `25k`, `50rb`, `1.5jt`, `150000`, `Rp 25.000`.
2. **Transfer Extraction:**
   - Pattern: `(tf|transfer)\s+(\d+[k|rb|jt]?)\s+(dari\s+)?(\w+)\s+(ke\s+)(\w+)`
   - Atomically records an expense on source account and an income on destination account.
3. **Category Auto-Tagging:**
   - Heuristic dictionary lookup matches keywords (`kopi`, `makan`, `bensin`, `laundry`, `listrik`, `wifi`) to predefined standard categories.
4. **Account Fallback:**
   - If an account keyword is omitted (e.g., `kopi 25k`), the engine defaults automatically to the user's configured `pocket_account`.

---

## 6. REST API Design Specifications

All routes live under `/api/v1` and return standard JSON payloads.

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Obtain JWT bearer token | No |
| `POST` | `/api/v1/auth/google` | Google OAuth 2.0 credential sign-in | No |
| `POST` | `/api/v1/auth/telegram-webapp` | Zero-click cryptographic HMAC auth from Telegram Mini App | No |
| `GET` | `/api/v1/auth/me` | Fetch active user profile & preferences | Yes |
| `POST` | `/api/v1/auth/telegram/link` | Bind Telegram Chat ID to active tenant | Yes |
| `POST` | `/api/v1/auth/telegram/custom-bot` | Register BYOB token and webhook | Yes |
| `GET` | `/api/v1/accounts/` | List user accounts & current balances | Yes |
| `POST` | `/api/v1/accounts/` | Create a new financial account | Yes |
| `GET` | `/api/v1/transactions/` | Paginated transactions with date filters | Yes |
| `POST` | `/api/v1/transactions/` | Record single manual transaction | Yes |
| `GET` | `/api/v1/transactions/summary` | Real-time pacing, burn rate, and aggregates | Yes |
| `GET` | `/api/v1/paycheck/config` | Get active cycle days & pocket account | Yes |
| `PUT` | `/api/v1/paycheck/config` | Update cycle duration and anchors | Yes |
| `GET` | `/api/v1/analytics/trends` | Monthly & cycle category burn breakdown | Yes |
| `GET` | `/api/v1/goals/` | Target savings goals & progress tracking | Yes |

---

## 7. Frontend Architecture (Next.js 14 App Router)

- **Design System:** Obsidian / Slate Dark Theme (`#0B0D11`, `#12151D`, `#181C26`, `#252B3B`) with Amber Gold (`#F59E0B`), Mint Rise (`#10B981`), and Cyan Hub accents.
- **Strict UI Conventions:**
  - **Zero Unstyled Form Elements:** Raw `<select>` and default text inputs are prohibited. All dropdown selections utilize React Portal modals (`CustomSelect`).
  - **Currency Masking:** All monetary inputs utilize `CurrencyInput` with real-time Rupiah thousands separation (`Rp 1.000.000`).
- **Static Export Optimization:** Built via `next build` into `frontend/out`, then served directly through FastAPI static file mounts for single-port deployment (`8080`).

---

## 8. Network Topology & Cloudflare Zero Trust Tunnel

To maintain zero attack surface without opening VM inbound firewall ports:

```text
[ Internet Client / Browser / TMA ]
                 |
                 v (HTTPS 443 with Edge SSL Termination & DDoS Protection)
    [ Cloudflare Global Edge ]
                 |
                 v (Encrypted QUIC / HTTP2 Tunnel over Outbound Ports)
        [ cloudflared daemon ] (ai7-finance-studio host)
                 |
                 v (Internal Loopback HTTP)
   [ FastAPI Backend / Next.js SPA ] (localhost:8080)
```

1. **Zero Open Ports:** All public inbound traffic is handled by Cloudflare Edge proxies. No open ports (80/443/8080) are required on the host VM's Network Security Group (NSG).
2. **Internal Service Isolation:** Sensitive local daemon ports (such as internal AI gateway `9router` on port 20128) are strictly bound to localhost and never mapped to public hostname routes.
3. **Public Hostname Mapping:** The public route `ai7finance.alifihsan.my.id` directs strictly to `http://localhost:8080`.
4. **Google OAuth 2.0 Origin Synchronization:** Production URLs are explicitly whitelisted as Authorized JavaScript Origins and Redirect URIs in the Google Cloud Console to ensure RFC-compliant credential handling.
