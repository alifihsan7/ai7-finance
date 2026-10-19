# Production Deployment Guide 🚀

Panduan komprehensif untuk mendeploy ekosistem **ai7.finance** ke server Linux (Ubuntu/Debian) untuk operasi 24/7 dengan arsitektur zero attack surface (tanpa membuka port inbound).

---

## 1. Arsitektur Deployment

```text
[ Internet Client / Browser / TMA ]
                 |
                 v (HTTPS 443 with Edge SSL Termination & DDoS Protection)
    [ Cloudflare Global Edge ]
                 |
                 v (Encrypted QUIC / HTTP2 Tunnel over Outbound Ports)
        [ cloudflared daemon ] (ai7-finance host)
                 |
                 v (Internal Loopback HTTP)
   [ FastAPI Backend / Next.js SPA ] (localhost:8080)
```

- **Zero Open Ports:** Tidak perlu membuka port inbound (80, 443, atau 8080) pada firewall VM atau Network Security Group (NSG).
- **Auto SSL/TLS:** Sertifikat SSL/TLS diterbitkan dan diperbarui otomatis oleh Cloudflare di level edge.
- **DDoS & WAF Protection:** Trafik publik disaring oleh jaringan global Cloudflare sebelum menyentuh server Anda.

---

## 2. Linux Systemd Services (Background 24/7)

Jalankan backend API/Web dan Telegram Bot sebagai background services yang otomatis restart saat terjadi kegagalan atau reboot server.

### A. Web Service (`/etc/systemd/system/ai7-finance-web.service`)

```ini
[Unit]
Description=AI7 Finance Web Dashboard & REST API
After=network.target postgresql.service

[Service]
Type=simple
User=your_linux_user
WorkingDirectory=/path/to/ai7-finance
ExecStart=/path/to/ai7-finance/run_web.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### B. Telegram Bot Service (`/etc/systemd/system/ai7-finance.service`)

```ini
[Unit]
Description=AI7 Finance Telegram Companion Bot
After=network.target postgresql.service

[Service]
Type=simple
User=your_linux_user
WorkingDirectory=/path/to/ai7-finance
ExecStart=/path/to/ai7-finance/run_bot.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### C. Mengaktifkan & Menjalankan Layanan

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai7-finance-web.service ai7-finance.service

# Memeriksa status
sudo systemctl status ai7-finance-web.service ai7-finance.service --no-pager
```

---

## 3. Cloudflare Zero Trust Tunnel Setup

Cloudflare Tunnel memungkinkan server lokal diekspos ke domain kustom secara aman dan 100% gratis.

### A. Instalasi `cloudflared` di Server

```bash
# Unduh paket resmi Debian/Ubuntu 64-bit
curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Pasang paket dan hapus berkas installer
sudo dpkg -i /tmp/cloudflared.deb && rm /tmp/cloudflared.deb

# Verifikasi versi
cloudflared --version
```

### B. Menghubungkan Tunnel ke Cloudflare Zero Trust

1. Buka dashboard Cloudflare: [one.dash.cloudflare.com](https://one.dash.cloudflare.com)
2. Masuk ke menu **Networks** ➔ **Tunnels** ➔ Klik **Add a tunnel** (atau *Create a tunnel*).
3. Pilih konektor **Cloudflared** ➔ Beri nama tunnel (misal: `ai7-finance`).
4. Pada bagian *Install and run a connector*, pilih tab **Debian / Ubuntu 64-bit**.
5. Salin dan jalankan perintah service install di terminal server:
   ```bash
   sudo cloudflared service install <CLOUDFLARE_TUNNEL_TOKEN>
   ```
6. Pastikan status konektor di dashboard Cloudflare berubah menjadi centang hijau **Connected / Healthy**.

### C. Mengonfigurasi Routing Domain Publik (Public Hostname)

1. Di dashboard tunnel Cloudflare, buka tab **Routes** ➔ Klik **+ Add a route** (atau *Published Application*).
2. Isi formulir routing:
   - **Route type:** Published application
   - **Subdomain:** `finance` (atau `ai7finance`)
   - **Domain:** Pilih domain aktif Anda (misal: `yourdomain.com`)
   - **Path:** Kosongkan
   - **Service Type:** `HTTP`
   - **URL:** `localhost:8080` (atau `127.0.0.1:8080`)
3. Klik **Save route**. Web dashboard kini dapat diakses melalui `https://finance.yourdomain.com`.

---

## 4. Konfigurasi Google OAuth 2.0 (Sign In with Google)

Jika fitur *Sign in with Google* diaktifkan, Anda wajib mendaftarkan origin domain publik di Google Cloud Console untuk menghindari `Error 400: origin_mismatch`.

1. Buka **Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)
2. Masuk ke **APIs & Services** ➔ **Credentials**.
3. Klik Client ID aplikasi Anda pada tabel **OAuth 2.0 Client IDs**.
4. Pada bagian **Authorized JavaScript origins**:
   - Tambahkan URL origin lengkap: `https://finance.yourdomain.com`
5. Pada bagian **Authorized redirect URIs**:
   - Tambahkan URL callback: `https://finance.yourdomain.com`
6. Klik **Save**. Perubahan biasanya aktif dalam 1–5 menit.

---

## 5. Sinkronisasi Variabel Lingkungan (`.env`)

Setelah domain publik aktif, perbarui variabel `APP_BASE_URL` di berkas lingkungan agar integrasi Telegram Mini App dan tautan dashboard otomatis menggunakan URL resmi:

```env
# URL publik resmi untuk Telegram Mini App & Bot
APP_BASE_URL=https://finance.yourdomain.com
```

Setelah memperbarui `.env`, restart layanan bot agar tombol menu Telegram tersinkronisasi:
```bash
sudo systemctl restart ai7-finance.service
```

---

## 6. Verifikasi & Pemecahan Masalah (Troubleshooting)

| Gejala Masalah | Penyebab Umum | Solusi |
|---|---|---|
| Web mengembalikan status `502 Bad Gateway` | Layanan `ai7-finance-web.service` belum berjalan | Cek dengan `sudo systemctl status ai7-finance-web.service` dan jalankan `sudo systemctl start ai7-finance-web.service`. |
| Error `400: origin_mismatch` saat Login Google | Domain belum terdaftar di Google Cloud Console | Masukkan URL domain publik ke *Authorized JavaScript origins* di Google Cloud Console. |
| Telegram Mini App menampilkan layar blank | URL `APP_BASE_URL` masih mengarah ke localhost/Tailscale lama | Perbarui `APP_BASE_URL` di `.env` menjadi domain HTTPS publik dan restart bot service. |
| Tunnel berstatus `Down` setelah server reboot | Layanan systemd `cloudflared` belum di-enable | Jalankan `sudo systemctl enable --now cloudflared`. |
