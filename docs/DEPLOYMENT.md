# Production Deployment Guide 🚀

Panduan komprehensif untuk mendeploy ekosistem **ai7.finance** ke server Linux (Ubuntu/Debian) untuk operasi 24/7 menggunakan systemd, database PostgreSQL, reverse proxy HTTPS, dan konfigurasi environment variables yang aman.

---

## 1. Arsitektur Deployment

```text
[ Client / Browser / Telegram Mini App ]
                   |
                   v (HTTPS 443 with SSL/TLS)
       [ Reverse Proxy (Nginx / Caddy) ]
                   |
                   v (HTTP Loopback: http://127.0.0.1:8080)
      [ FastAPI REST Backend & Next.js ] (ai7-finance-web.service)
                   ^
                   | (TCP / localhost:5432)
         [ PostgreSQL Database ]
```

Sistem backend dan antarmuka web disajikan melalui satu port internal (`8080`) oleh Uvicorn/FastAPI, dengan Telegram companion bot berjalan sebagai worker service terpisah yang berkomunikasi langsung ke database PostgreSQL yang sama.

Komponen utama:
1. **PostgreSQL Database:** Penyimpanan relasional multi-tenant ACID untuk seluruh transaksi, akun, strata/envelope, dan riwayat siklus.
2. **Web & API Service (`ai7-finance-web.service`):** Menjalankan FastAPI server dan melayani static export Next.js 14 pada `127.0.0.1:8080`.
3. **Telegram Bot Service (`ai7-finance.service`):** Menjalankan worker polling Telegram secara background untuk ingestion cepat dan respons bot.
4. **Reverse Proxy (Nginx/Caddy):** Mengelola SSL/TLS termination (HTTPS) dan mengarahkan lalu lintas publik ke `127.0.0.1:8080`.

---

## 2. Prasyarat Server

Pastikan server Anda memenuhi persyaratan minimum berikut:
- **OS:** Ubuntu 22.04 LTS / Debian 12 (atau distro Linux modern lainnya)
- **Runtime:** Python 3.10+ & `pip`
- **Node.js:** Node.js 18+ LTS & `npm`
- **Database:** PostgreSQL 14+
- **Tooling:** `git`, `curl`, `build-essential`, `libpq-dev`

```bash
sudo apt update && sudo apt install -y python3 python3-venv python3-pip nodejs npm postgresql postgresql-contrib git libpq-dev
```

---

## 3. Setup Database PostgreSQL

1. Buka console PostgreSQL sebagai user superuser:

```bash
sudo -u postgres psql
```

2. Jalankan perintah SQL berikut untuk membuat user dan database:

```sql
CREATE USER ai7user WITH PASSWORD 'ganti_dengan_password_aman_anda';
CREATE DATABASE ai7_finance OWNER ai7user;
GRANT ALL PRIVILEGES ON DATABASE ai7_finance TO ai7user;
\q
```

3. Format `DATABASE_URL` yang dihasilkan untuk konfigurasi `.env`:
```text
postgresql://ai7user:ganti_dengan_password_aman_anda@localhost:5432/ai7_finance
```

---

## 4. Instalasi & Build Aplikasi

1. Clone repositori ke direktori server:

```bash
git clone https://github.com/alifihsan7/ai7-finance.git
cd ai7-finance
```

2. Setup virtual environment Python dan pasang dependensi backend:

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

3. Build frontend Next.js dan sinkronisasi static build ke direktori static FastAPI:

```bash
cd frontend
npm install
npm run build
cd ..

# Salin aset statis ke direktori server
rm -rf static/*
cp -r frontend/out/* static/
cp frontend/public/manifest.json static/
```

---

## 5. Konfigurasi Variabel Lingkungan (`backend/.env`)

Salin berkas template lingkungan ke `backend/.env`:

```bash
cp .env.example backend/.env
```

Buka `backend/.env` dan sesuaikan parameter berikut:

```env
# --- Database Configuration ---
DATABASE_URL=postgresql://ai7user:ganti_dengan_password_aman_anda@localhost:5432/ai7_finance

# --- Security & Auth ---
# Generate secret key dengan: openssl rand -hex 32
JWT_SECRET_KEY=your_secure_random_32_character_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# --- Server & Base URL ---
# URL domain HTTPS publik resmi aplikasi Anda (digunakan untuk CORS & TMA SSO)
APP_BASE_URL=https://finance.yourdomain.com
TIMEZONE=Asia/Jakarta

# --- Telegram Bot Configuration ---
BOT_TOKEN=your_telegram_bot_token_from_botfather
ALLOWED_USER_ID=your_master_telegram_chat_id

# --- Google OAuth (Opsional) ---
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

---

## 6. Linux Systemd Services (Background 24/7)

Jalankan backend Web/API dan Telegram Bot sebagai background systemd services yang tangguh dan otomatis restart saat reboot atau kegagalan proses.

> **Catatan:** Ganti `your_user` dan `/path/to/ai7-finance` dengan username Linux dan path absolut direktori repositori Anda.

### A. Web Service (`/etc/systemd/system/ai7-finance-web.service`)

Buat berkas unit:
```bash
sudo nano /etc/systemd/system/ai7-finance-web.service
```

Isi konfigurasi:
```ini
[Unit]
Description=AI7 Finance Web Dashboard & REST API
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ai7-finance
ExecStart=/path/to/ai7-finance/run_web.sh
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

### B. Telegram Bot Service (`/etc/systemd/system/ai7-finance.service`)

Buat berkas unit:
```bash
sudo nano /etc/systemd/system/ai7-finance.service
```

Isi konfigurasi:
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
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

### C. Mengaktifkan & Menjalankan Layanan

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai7-finance-web.service ai7-finance.service

# Periksa status layanan
sudo systemctl status ai7-finance-web.service ai7-finance.service --no-pager
```

Untuk memantau log secara real-time:
```bash
journalctl -u ai7-finance-web.service -f
journalctl -u ai7-finance.service -f
```

---

## 7. Konfigurasi Reverse Proxy (Nginx & SSL/TLS)

Gunakan reverse proxy seperti Nginx untuk meneruskan trafik publik HTTPS (port 443) ke Uvicorn internal (`http://127.0.0.1:8080`).

### Contoh Konfigurasi Nginx (`/etc/nginx/sites-available/ai7-finance`)

```nginx
server {
    listen 80;
    server_name finance.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan site dan pasang sertifikat SSL gratis via Certbot (Let's Encrypt):

```bash
sudo ln -s /etc/nginx/sites-available/ai7-finance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Pasang sertifikat SSL otomatis
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d finance.yourdomain.com
```

---

## 8. Konfigurasi Google OAuth 2.0 (Opsional)

Jika fitur *Sign in with Google* diaktifkan, Anda wajib mendaftarkan origin domain publik di Google Cloud Console untuk menghindari `Error 400: origin_mismatch`:

1. Buka **Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)
2. Masuk ke **APIs & Services** ➔ **Credentials**.
3. Klik Client ID aplikasi Anda pada tabel **OAuth 2.0 Client IDs**.
4. Pada bagian **Authorized JavaScript origins**:
   - Tambahkan URL origin lengkap: `https://finance.yourdomain.com`
5. Pada bagian **Authorized redirect URIs**:
   - Tambahkan URL callback: `https://finance.yourdomain.com`
6. Klik **Save**. Perubahan biasanya aktif dalam 1–5 menit.

---

## 9. Verifikasi & Pemecahan Masalah (Troubleshooting)

| Gejala Masalah | Penyebab Umum | Solusi |
|---|---|---|
| Web mengembalikan status `502 Bad Gateway` | Layanan `ai7-finance-web.service` belum berjalan atau crash | Cek dengan `journalctl -u ai7-finance-web.service -e` dan pastikan port `8080` aktif via `curl http://127.0.0.1:8080/health`. |
| Gagal koneksi database (`psycopg2.OperationalError`) | Kredensial atau host PostgreSQL tidak sesuai | Uji koneksi psql: `psql -U ai7user -d ai7_finance -h localhost` dan pastikan password di `backend/.env` benar. |
| Telegram Mini App menampilkan layar blank | URL `APP_BASE_URL` masih mengarah ke localhost atau IP lokal | Perbarui `APP_BASE_URL` di `backend/.env` menjadi domain HTTPS publik (`https://finance.yourdomain.com`) dan restart `ai7-finance.service`. |
| Error `400: origin_mismatch` saat Login Google | Domain belum terdaftar di Google Cloud Console | Masukkan URL domain publik ke *Authorized JavaScript origins* di Google Cloud Console. |
| Perubahan frontend tidak muncul | Lupa build atau copy static build | Jalankan ulang perintah build di `frontend` dan salin hasil build ke direktori `static/`. |
