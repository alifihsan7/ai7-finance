import os
import sys
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Palette Definition
COLOR_PRIMARY = colors.HexColor("#0B0D11")      # Obsidian Bg
COLOR_PANEL = colors.HexColor("#12151D")        # Obsidian Panel
COLOR_CARD = colors.HexColor("#181C26")         # Obsidian Card
COLOR_BORDER = colors.HexColor("#252B3B")       # Border
COLOR_AMBER = colors.HexColor("#D97706")        # Amber Gold Accent (print friendly)
COLOR_MINT = colors.HexColor("#059669")         # Mint Rise Accent
COLOR_CYAN = colors.HexColor("#0284C7")         # Cyan Hub Accent
COLOR_TEXT_MAIN = colors.HexColor("#0F172A")    # Slate 900 for print clarity
COLOR_TEXT_MUTED = colors.HexColor("#64748B")   # Slate 500
COLOR_BG_LIGHT = colors.HexColor("#F8FAFC")     # Slate 50 for callout boxes
COLOR_WHITE = colors.HexColor("#FFFFFF")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Skip cover page
            return
        
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)
        
        # Header
        self.drawString(2 * cm, 28.3 * cm, "AI7 Finance — Buku Panduan Pengguna & Referensi Sistem")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(2 * cm, 28.1 * cm, 19 * cm, 28.1 * cm)
        
        # Footer
        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(19 * cm, 1.2 * cm, page_str)
        self.drawString(2 * cm, 1.2 * cm, "Dokumentasi Resmi • Open Source Edition")
        self.line(2 * cm, 1.5 * cm, 19 * cm, 1.5 * cm)
        self.restoreState()

def create_guide_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=COLOR_PRIMARY,
        alignment=0,
        spaceAfter=10
    )

    style_cover_subtitle = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=COLOR_TEXT_MUTED,
        spaceAfter=25
    )

    style_h1 = ParagraphStyle(
        'ChapterH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_PRIMARY,
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_AMBER,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    style_body = ParagraphStyle(
        'GuideBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=COLOR_TEXT_MAIN,
        spaceAfter=6
    )

    style_bullet = ParagraphStyle(
        'GuideBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=COLOR_TEXT_MAIN,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    style_code = ParagraphStyle(
        'GuideCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    style_table_header = ParagraphStyle(
        'GuideTableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=COLOR_WHITE
    )

    style_table_cell = ParagraphStyle(
        'GuideTableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=COLOR_TEXT_MAIN
    )

    story = []

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 40))
    # Brand tag
    badge_data = [[
        Paragraph("<font color='#D97706'><b>AI7.FINANCE</b></font> &nbsp;|&nbsp; BUKU PANDUAN PENGGUNA", ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_AMBER))
    ]]
    t_badge = Table(badge_data, colWidths=[17*cm])
    t_badge.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#FDE68A")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_badge)
    story.append(Spacer(1, 25))

    story.append(Paragraph("Buku Panduan & Referensi Sistem", style_cover_title))
    story.append(Paragraph("Panduan Lengkap Operasional Ekosistem Finansial Multi-Tenant: Pencatatan Cepat Telegram, Manajemen Siklus Anggaran, dan Analisis Dashboard Web.", style_cover_subtitle))
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_AMBER, spaceBefore=0, spaceAfter=25))

    # Meta box
    meta_content = [
        [Paragraph("<b>Edisi & Versi:</b>", style_table_cell), Paragraph("v1.0.0 (Open Source Release)", style_table_cell)],
        [Paragraph("<b>Lisensi:</b>", style_table_cell), Paragraph("MIT License (Free & Open Source)", style_table_cell)],
        [Paragraph("<b>Platform:</b>", style_table_cell), Paragraph("FastAPI • Next.js 14 • PostgreSQL • Telegram Bot & Mini App", style_table_cell)],
        [Paragraph("<b>Tanggal Publikasi:</b>", style_table_cell), Paragraph("Oktober 2026", style_table_cell)],
        [Paragraph("<b>Penyusun:</b>", style_table_cell), Paragraph("Alif Ihsan & Tim Kontributor AI7 Finance", style_table_cell)],
        [Paragraph("<b>Repositori Resmi:</b>", style_table_cell), Paragraph("https://github.com/alifihsan7/ai7-finance", style_table_cell)],
        [Paragraph("<b>Web Resmi:</b>", style_table_cell), Paragraph("https://ai7finance.alifihsan.my.id", style_table_cell)],
    ]
    t_meta = Table(meta_content, colWidths=[4.5*cm, 12.5*cm])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 40))

    callout_cover = [
        [Paragraph("<b>💡 Ringkasan Inti:</b> Buku panduan ini ditujukan bagi pengguna baru maupun administrator teknis yang ingin memaksimalkan ekosistem <b>ai7.finance</b>. Anda akan mempelajari cara mencatat pengeluaran harian dalam hitungan detik via Telegram, mengatur siklus anggaran fleksibel (7/14/30 hari), dan mengevaluasi kesehatan finansial secara real-time.", style_body)]
    ]
    t_callout = Table(callout_cover, colWidths=[17*cm])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BBF7D0")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_callout)

    story.append(PageBreak())

    # =========================================================================
    # DAFTAR ISI & BAB 1
    # =========================================================================
    story.append(Paragraph("Daftar Isi Panduan", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=15))

    toc_data = [
        [Paragraph("<b>Bab 1: Pengenalan & Filosofi AI7 Finance</b>", style_table_cell), Paragraph("Halaman 2", style_table_cell)],
        [Paragraph("<b>Bab 2: Onboarding & Konfigurasi Profil Awal</b>", style_table_cell), Paragraph("Halaman 3", style_table_cell)],
        [Paragraph("<b>Bab 3: Integrasi Telegram Companion Bot</b>", style_table_cell), Paragraph("Halaman 4", style_table_cell)],
        [Paragraph("<b>Bab 4: Panduan Input Cepat Telegram Bot</b>", style_table_cell), Paragraph("Halaman 5", style_table_cell)],
        [Paragraph("<b>Bab 5: Membaca Metrik Pacing & Safe-to-Spend</b>", style_table_cell), Paragraph("Halaman 6", style_table_cell)],
        [Paragraph("<b>Bab 6: Buku Kas, Tagihan Rutin & Target Tabungan</b>", style_table_cell), Paragraph("Halaman 7", style_table_cell)],
        [Paragraph("<b>Bab 7: FAQ & Pemecahan Masalah (Troubleshooting)</b>", style_table_cell), Paragraph("Halaman 8", style_table_cell)],
    ]
    t_toc = Table(toc_data, colWidths=[14*cm, 3*cm])
    t_toc.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 20))

    story.append(Paragraph("Bab 1: Pengenalan & Filosofi AI7 Finance", style_h1))
    story.append(Paragraph("1.1 Masalah pada Aplikasi Finansial Tradisional", style_h2))
    story.append(Paragraph("Mayoritas aplikasi pencatat keuangan gagal bukan karena fiturnya kurang banyak, melainkan karena <b>friksi input yang terlalu tinggi</b>. Membuka aplikasi, menunggu splash screen, memilih dropdown akun, mengetik nominal, dan memilih sub-kategori memakan waktu 20-30 detik per transaksi. Akibatnya, pengguna berhenti mencatat setelah beberapa hari.", style_body))
    story.append(Paragraph("Selain itu, pendekatan kalender bulanan kaku (tanggal 1 s/d 31) seringkali tidak cocok dengan realitas arus kas pekerja yang menerima gaji per 2 pekan (bi-weekly) atau mingguan.", style_body))

    story.append(Paragraph("1.2 Solusi AI7 Finance: Two-Pillar Architecture", style_h2))
    story.append(Paragraph("AI7 Finance dibangun di atas dua pilar utama yang saling melengkapi:", style_body))
    story.append(Paragraph("• <b>Fast Ingestion via Telegram:</b> Mencatat transaksi harian dalam waktu kurang dari 2 detik menggunakan teks natural (misal: <code>kopi 25k bca</code>), foto struk fisik kasir, atau rekaman suara (voice note).", style_bullet))
    story.append(Paragraph("• <b>Deep Analytical Web Dashboard:</b> Antarmuka web modern bernuansa Slate Dark untuk mereview performa portofolio bulanan, alokasi amplop, dan burn-rate belanja harian.", style_bullet))

    story.append(Paragraph("1.3 Filosofi Anggaran: Dynamic Rolling Cycles", style_h2))
    story.append(Paragraph("Alih-alih membatasi anggaran secara kalender statis, AI7 Finance menggunakan konsep <b>siklus bergulir fleksibel (7, 14, atau 30 hari)</b> yang diikatkan langsung ke tanggal penerimaan gaji (Paycheck Anchor). Setiap siklus berjalan memiliki kuota belanja harian yang dihitung ulang secara dinamis (*Velocity Pacing*).", style_body))

    story.append(PageBreak())

    # =========================================================================
    # BAB 2: ONBOARDING & PROFIL
    # =========================================================================
    story.append(Paragraph("Bab 2: Onboarding & Konfigurasi Profil", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=12))

    story.append(Paragraph("2.1 Akses Pertama Kali ke Web Dashboard", style_h2))
    story.append(Paragraph("Buka URL web dashboard Anda di <code>https://ai7finance.alifihsan.my.id</code> (atau <code>http://localhost:8080</code> untuk instalasi lokal). Pada pojok kiri bawah sidebar, klik tombol <b>Masuk / Akun</b> untuk membuka modal autentikasi.", style_body))
    story.append(Paragraph("• <b>Registrasi Akun Baru:</b> Buat akun menggunakan email dan password yang aman, atau gunakan tombol <b>Sign in with Google</b> jika Google OAuth telah diaktifkan.", style_bullet))
    story.append(Paragraph("• <b>Isolasi Data Penuh:</b> Setiap akun yang terdaftar memiliki database terisolasi. Pengguna lain di server yang sama tidak dapat melihat rekening atau riwayat transaksi Anda.", style_bullet))

    story.append(Paragraph("2.2 Menentukan Durasi Siklus Anggaran", style_h2))
    story.append(Paragraph("Masuk ke modal <b>Profil Pengguna</b> ➔ Tab <b>Siklus Finansial</b>:", style_body))
    story.append(Paragraph("1. <b>Pilih Model Siklus:</b>", style_bullet))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>14 Hari (Bi-Weekly):</b> Sangat disarankan untuk pekerja dengan siklus gajian 2-mingguan.", style_bullet))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>30 Hari (Bulanan):</b> Standar umum untuk siklus gajian bulanan (misal tanggal 25 atau akhir bulan).", style_bullet))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>7 Hari (Mingguan):</b> Untuk evaluasi sprint keuangan mingguan yang sangat ketat.", style_bullet))
    story.append(Paragraph("2. <b>Rekening Saku Operasional (Pocket Account):</b> Tentukan rekening utama yang digunakan untuk belanja harian (misal: Mandiri, BCA, atau Cash). Rekening inilah yang akan dimonitor oleh speedometer <i>Safe-to-Spend</i>.", style_bullet))
    story.append(Paragraph("3. <b>Plafon Saku Belanja:</b> Tentukan batas maksimal belanja operasional per siklus (contoh: Rp 825.000 untuk 14 hari).", style_bullet))

    story.append(Paragraph("2.3 Mengatur Rekening & Pos Saldo", style_h2))
    story.append(Paragraph("Buka menu navigasi <b>Rekening & Akun</b> untuk menambah atau menyesuaikan rekening finansial Anda:", style_body))

    acc_guide = [
        [Paragraph("<b>Nama Pos</b>", style_table_header), Paragraph("<b>Tipe</b>", style_table_header), Paragraph("<b>Fungsi & Rekomendasi Alokasi</b>", style_table_header)],
        [Paragraph("<b>Rekening Utama</b>", style_table_cell), Paragraph("Bank / E-Wallet", style_table_cell), Paragraph("Saku belanja harian & operasional (50% dari pendapatan).", style_table_cell)],
        [Paragraph("<b>Rekening Tagihan</b>", style_table_cell), Paragraph("Bank", style_table_cell), Paragraph("Khusus autodebet tagihan listrik, internet, dan langganan digital (20%).", style_table_cell)],
        [Paragraph("<b>Investasi</b>", style_table_cell), Paragraph("Reksadana/Saham", style_table_cell), Paragraph("Portofolio pertumbuhan aset jangka menengah-panjang (20%).", style_table_cell)],
        [Paragraph("<b>Dana Darurat</b>", style_table_cell), Paragraph("Bank Likuid", style_table_cell), Paragraph("Cadangan kas likuid yang tidak boleh disentuh untuk belanja (10%).", style_table_cell)],
    ]
    t_acc = Table(acc_guide, colWidths=[3.5*cm, 3*cm, 10.5*cm])
    t_acc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_CARD),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_acc)

    story.append(PageBreak())

    # =========================================================================
    # BAB 3: INTEGRASI TELEGRAM
    # =========================================================================
    story.append(Paragraph("Bab 3: Integrasi Telegram Companion Bot", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=12))

    story.append(Paragraph("3.1 Memilih Mode Telegram Engine", style_h2))
    story.append(Paragraph("AI7 Finance mendukung dua mode pengoperasian bot:", style_body))

    mode_data = [
        [Paragraph("<b>Fitur</b>", style_table_header), Paragraph("<b>Mode A: Shared Bot (Paling Praktis)</b>", style_table_header), Paragraph("<b>Mode B: BYOB (Privat Eksklusif)</b>", style_table_header)],
        [Paragraph("<b>Bot Telegram</b>", style_table_cell), Paragraph("Menggunakan bot bersama <code>@AI7Fin4nc3_bot</code>.", style_table_cell), Paragraph("Bot buatan Anda sendiri dari <code>@BotFather</code>.", style_table_cell)],
        [Paragraph("<b>Setup</b>", style_table_cell), Paragraph("Hanya butuh Chat ID Telegram (1 menit).", style_table_cell), Paragraph("Memasukkan Bot Token dari BotFather.", style_table_cell)],
        [Paragraph("<b>Privasi Data</b>", style_table_cell), Paragraph("Terisolasi aman berdasarkan Chat ID Anda.", style_table_cell), Paragraph("Eksklusif milik Anda, tidak ada user lain di bot.", style_table_cell)],
    ]
    t_mode = Table(mode_data, colWidths=[3*cm, 7*cm, 7*cm])
    t_mode.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_CARD),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_mode)
    story.append(Spacer(1, 12))

    story.append(Paragraph("3.2 Langkah Menghubungkan Shared Bot (Mode A)", style_h2))
    story.append(Paragraph("1. Buka Telegram dan cari bot resmi Anda (atau <code>@AI7Fin4nc3_bot</code>).", style_bullet))
    story.append(Paragraph("2. Kirim pesan <code>/start</code>. Bot akan membalas dengan menampilkan <b>Chat ID Telegram</b> Anda (angka numerik 9-10 digit).", style_bullet))
    story.append(Paragraph("3. Buka Web Dashboard ➔ Klik profil di pojok kiri bawah ➔ Tab <b>Integrasi Telegram</b>.", style_bullet))
    story.append(Paragraph("4. Pilih <b>Shared Bot</b>, tempelkan angka Chat ID Anda, lalu klik <b>Hubungkan Telegram</b>.", style_bullet))
    story.append(Paragraph("5. Bot Telegram akan langsung mengirimkan pesan konfirmasi sukses! 🎉", style_bullet))

    story.append(Paragraph("3.3 Langkah Menghubungkan Bot Pribadi / BYOB (Mode B)", style_h2))
    story.append(Paragraph("1. Buka <code>@BotFather</code> di Telegram, ketik <code>/newbot</code>, dan ikuti instruksi untuk membuat bot baru.", style_bullet))
    story.append(Paragraph("2. Salin token HTTP API yang diberikan (format: <code>123456789:AA...</code>).", style_bullet))
    story.append(Paragraph("3. Masuk ke Web Dashboard ➔ Modal Profil ➔ Tab <b>Integrasi Telegram</b> ➔ Pilih <b>Bot Pribadi (BYOB)</b>.", style_bullet))
    story.append(Paragraph("4. Tempelkan bot token Anda dan klik <b>Verifikasi & Simpan</b>.", style_bullet))

    story.append(Spacer(1, 8))
    story.append(Paragraph("3.4 Akses Telegram Mini App (In-App Web Dashboard)", style_h2))
    story.append(Paragraph("Selain interaksi pesan teks, Anda dapat membuka seluruh Web Dashboard secara visual langsung di dalam Telegram:", style_body))
    story.append(Paragraph("• <b>Tombol Menu Tetap:</b> Klik tombol <b>📊 Dashboard</b> di sebelah kiri kolom ketik chat bot untuk membuka dashboard.", style_bullet))
    story.append(Paragraph("• <b>Zero-Click SSO:</b> Masuk otomatis secara aman tanpa mengetik password berkat validasi kriptografi Telegram WebApp.", style_bullet))
    story.append(Paragraph("• <b>Tampilan Native:</b> Dashboard meluncur mulus dalam layar penuh dengan tema gelap Slate Obsidian.", style_bullet))

    story.append(PageBreak())

    # =========================================================================
    # BAB 4: PANDUAN INPUT TELEGRAM
    # =========================================================================
    story.append(Paragraph("Bab 4: Panduan Input Cepat Telegram Bot", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=12))

    story.append(Paragraph("4.1 Format Teks Natural (Zero-Prompt LLM)", style_h2))
    story.append(Paragraph("Bot mengenali pola angka dan satuan uang secara instan tanpa biaya token API. Anda cukup mengetikkan transaksi seperti mengobrol biasa:", style_body))

    syntax_table = [
        [Paragraph("<b>Contoh Ketikan Pengguna</b>", style_table_header), Paragraph("<b>Tipe</b>", style_table_header), Paragraph("<b>Nominal</b>", style_table_header), Paragraph("<b>Akun Terpilih</b>", style_table_header), Paragraph("<b>Kategori Otomatis</b>", style_table_header)],
        [Paragraph("<code>kopi susu 25k bca</code>", style_code), Paragraph("Pengeluaran", style_table_cell), Paragraph("Rp 25.000", style_table_cell), Paragraph("BCA", style_table_cell), Paragraph("Jajan / Ngopi", style_table_cell)],
        [Paragraph("<code>makan siang 35rb mandiri</code>", style_code), Paragraph("Pengeluaran", style_table_cell), Paragraph("Rp 35.000", style_table_cell), Paragraph("Mandiri", style_table_cell), Paragraph("Makanan & Minuman", style_table_cell)],
        [Paragraph("<code>bensin pertamax 50rb</code>", style_code), Paragraph("Pengeluaran", style_table_cell), Paragraph("Rp 50.000", style_table_cell), Paragraph("Saku Belanja (Default)", style_table_cell), Paragraph("Transportasi", style_table_cell)],
        [Paragraph("<code>laundry 35k</code>", style_code), Paragraph("Pengeluaran", style_table_cell), Paragraph("Rp 35.000", style_table_cell), Paragraph("Saku Belanja (Default)", style_table_cell), Paragraph("Laundry", style_table_cell)],
        [Paragraph("<code>gaji 5jt mandiri</code>", style_code), Paragraph("Pemasukan", style_table_cell), Paragraph("Rp 5.000.000", style_table_cell), Paragraph("Mandiri", style_table_cell), Paragraph("Gaji & Pendapatan", style_table_cell)],
        [Paragraph("<code>tf 100k mandiri ke jago</code>", style_code), Paragraph("Transfer", style_table_cell), Paragraph("Rp 100.000", style_table_cell), Paragraph("Mandiri ➔ Jago", style_table_cell), Paragraph("Transfer Antar Rekening", style_table_cell)],
    ]
    t_syn = Table(syntax_table, colWidths=[4.5*cm, 2.5*cm, 2.5*cm, 3.8*cm, 3.7*cm])
    t_syn.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_CARD),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_syn)
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.2 Pencatatan Transaksi Ganda (Multi-Line)", style_h2))
    story.append(Paragraph("Jika Anda berbelanja beberapa item sekaligus, kirim dalam satu bubble chat dengan baris baru:", style_body))
    
    code_block = [
        [Paragraph("<code>sarapan bubur 15k<br/>kopi kenangan 22k bca<br/>parkir motor 2k cash</code>", style_code)]
    ]
    t_code = Table(code_block, colWidths=[17*cm])
    t_code.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_code)
    story.append(Paragraph("Bot akan memproses ketiganya secara paralel dalam satu transaksi basis data ACID.", style_body))

    story.append(Paragraph("4.3 Foto Struk Kasir & Voice Note AI", style_h2))
    story.append(Paragraph("• <b>Foto Struk / Screenshot QRIS:</b> Cukup ambil foto struk belanja Indomaret/Alfamart/Restoran. Vision AI akan membaca total nominal, nama merchant, dan mencatatnya otomatis.", style_bullet))
    story.append(Paragraph("• <b>Voice Note:</b> Rekam suara Anda (misal: <i>'beli martabak manis 30 ribu pakai bca'</i>). Audio akan ditranskrip dan diparse secara instan.", style_bullet))

    story.append(PageBreak())

    # =========================================================================
    # BAB 5: MONITORING & PACING
    # =========================================================================
    story.append(Paragraph("Bab 5: Membaca Metrik Pacing & Safe-to-Spend", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=12))

    story.append(Paragraph("5.1 Konsep Safe-to-Spend (Batas Belanja Harian)", style_h2))
    story.append(Paragraph("Kebanyakan orang gagal menjaga anggaran karena mereka hanya tahu total sisa uang, tetapi tidak tahu <b>kecepatan belanja harian yang aman</b> sampai gajian berikutnya.", style_body))
    story.append(Paragraph("Setiap kali Anda mencatat pengeluaran di bot atau membuka web dashboard, sistem menampilkan indikator <b>Safe-to-Spend</b>:", style_body))

    story.append(Paragraph("$$\\text{Safe-to-Spend} = \\frac{\\text{Sisa Saldo Kuota Saku}}{\\text{Sisa Hari dalam Siklus}}$$", style_body))
    story.append(Paragraph("<i>Contoh:</i> Jika sisa kuota belanja Anda Rp 385.000 dan siklus masih tersisa 7 hari, maka Safe-to-Spend Anda adalah <b>Rp 55.000 / hari</b>.", style_body))

    story.append(Paragraph("5.2 Status Pacing Belanja", style_h2))
    
    pacing_data = [
        [Paragraph("<b>Status Pacing</b>", style_table_header), Paragraph("<b>Kondisi Finansial</b>", style_table_header), Paragraph("<b>Tindakan yang Disarankan</b>", style_table_header)],
        [Paragraph("<font color='#059669'><b>🟢 Pace Aman</b></font>", style_table_cell), Paragraph("Total belanja sampai hari ini masih di bawah batas garis ideal kumulatif.", style_table_cell), Paragraph("Pertahankan pola belanja harian seperti biasa.", style_table_cell)],
        [Paragraph("<font color='#DC2626'><b>🔴 Agak Boros</b></font>", style_table_cell), Paragraph("Laju belanja melampaui garis rata-rata ideal (over-velocity).", style_table_cell), Paragraph("Rem pengeluaran jajan/kopi 1-2 hari ke depan agar pacing kembali normal.", style_table_cell)],
    ]
    t_pace = Table(pacing_data, colWidths=[4*cm, 6.5*cm, 6.5*cm])
    t_pace.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_CARD),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_pace)
    story.append(Spacer(1, 12))

    story.append(Paragraph("5.3 Burn-Rate Trajectory Chart", style_h2))
    story.append(Paragraph("Pada dashboard utama, grafik <b>Burn-Rate Trajectory</b> membandingkan dua garis:", style_body))
    story.append(Paragraph("• <b>Garis Abu-abu Putus-putus:</b> Batas target akumulasi belanja ideal harian.", style_bullet))
    story.append(Paragraph("• <b>Bar Berwarna Amber:</b> Realisasi pengeluaran riil kumulatif saku belanja Anda.", style_bullet))
    story.append(Paragraph("Jika bar kuning melompat di atas garis putus-putus, Anda langsung tahu bahwa siklus ini sedang boros tanpa perlu menghitung kalkulator secara manual.", style_body))

    story.append(PageBreak())

    # =========================================================================
    # BAB 6: BUKU KAS & GOALS
    # =========================================================================
    story.append(Paragraph("Bab 6: Buku Kas, Tagihan Rutin & Target Tabungan", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=12))

    story.append(Paragraph("6.1 Modul Buku Kas (Transactions Ledger)", style_h2))
    story.append(Paragraph("Di menu navigasi <b>Buku Transaksi</b>, Anda dapat:", style_body))
    story.append(Paragraph("• Memfilter transaksi berdasarkan rentang tanggal, kategori, atau rekening spesifik.", style_bullet))
    story.append(Paragraph("• Mencari riwayat pengeluaran berdasarkan kata kunci (contoh: 'kopi', 'tokopedia', 'listrik').", style_bullet))
    story.append(Paragraph("• Melakukan <b>Edit</b> atau <b>Hapus</b> jika terjadi kesalahan penulisan nominal.", style_bullet))
    story.append(Paragraph("• <i>Fitur Pembatalan Instan via Bot:</i> Ketik <code>/batal</code> atau <code>/undo</code> di Telegram untuk menghapus transaksi terakhir yang baru saja diinput.", style_bullet))

    story.append(Paragraph("6.2 Monitoring Langganan & Tagihan Berulang", style_h2))
    story.append(Paragraph("Menu <b>Langganan & Tagihan</b> mengawasi semua komitmen autodebet berkala:", style_body))
    story.append(Paragraph("• Catat nominal dan tanggal jatuh tempo tagihan (Internet WiFi, Spotify, Netflix, BPJS, iCloud).", style_bullet))
    story.append(Paragraph("• Bot Telegram secara otomatis mengecek jadwal tagihan yang akan jatuh tempo dalam 7 hari ke depan setiap pagi pukul 09:00 WIB.", style_bullet))
    story.append(Paragraph("• Mencegah saldo rekening tagihan kosong saat autodebet bank berlangsung.", style_bullet))

    story.append(Paragraph("6.3 Target Finansial & Tabungan Terkunci (Goals)", style_h2))
    story.append(Paragraph("Menu <b>Target Finansial</b> membantu mewujudkan tujuan tabungan Anda:", style_body))
    story.append(Paragraph("• Tentukan target spesifik (misal: 'Dana Darurat 6 Bulan', 'Liburan Akhir Tahun', 'Beli Laptop').", style_bullet))
    story.append(Paragraph("• Visualisasi progress bar persentase pencapaian target secara real-time.", style_bullet))
    story.append(Paragraph("• Cek target kapan saja dari Telegram menggunakan perintah <code>/goals</code>.", style_bullet))

    story.append(PageBreak())

    # =========================================================================
    # BAB 7: FAQ & TROUBLESHOOTING
    # =========================================================================
    story.append(Paragraph("Bab 7: FAQ & Pemecahan Masalah", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=0, spaceAfter=12))

    faq_items = [
        ("Q: Mengapa bot Telegram tidak membalas pesan saya?", 
         "Pastikan dua hal: (1) Akun Telegram Anda sudah terhubung di Web Dashboard melalui input Chat ID, dan (2) Service ai7-finance.service sedang berjalan aktif di server. Jika bot baru saja dibuat atau token diganti, restart service dengan: sudo systemctl restart ai7-finance.service."),
        
        ("Q: Bagaimana jika saya salah memasukkan nominal transaksi?", 
         "Langsung ketik /batal atau /undo di Telegram dalam beberapa saat setelah mencatat. Transaksi terakhir akan langsung dihapus dari database. Anda juga bisa mengedit transaksi kapan saja melalui menu Buku Transaksi di Web Dashboard."),
         
        ("Q: Apakah data keuangan saya aman di server publik?", 
         "Sangat aman. AI7 Finance menerapkan isolasi tenant tingkat database (foreign key user_id), autentikasi JWT stateless dengan token terenkripsi, dan proteksi password hashing Bcrypt. Kredensial rahasia (.env) tidak pernah di-commit ke Git."),
         
        ("Q: Bagaimana cara mencatat transfer antar rekening?", 
         "Gunakan format: tf [nominal] [dari] ke [tujuan]. Contoh: tf 200k mandiri ke jago. Sistem secara otomatis membuat dua entri atomik: pengeluaran pada akun Mandiri dan pemasukan pada akun Jago."),
         
        ("Q: Apakah bisa digunakan bersama keluarga atau teman?", 
         "Ya! AI7 Finance adalah aplikasi multi-tenant. Teman atau anggota keluarga Anda cukup membuat akun di Web Dashboard dan menghubungkan Telegram mereka sendiri. Data kedua belah pihak 100% terpisah dan tidak saling melihat.")
    ]

    for q, a in faq_items:
        faq_box = [
            [Paragraph(f"<b>{q}</b>", style_h2)],
            [Paragraph(a, style_body)]
        ]
        t_faq = Table(faq_box, colWidths=[17*cm])
        t_faq.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), COLOR_BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(t_faq)
        story.append(Spacer(1, 8))

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_AMBER, spaceBefore=0, spaceAfter=10))
    story.append(Paragraph("<font color='#64748B'><b>AI7 Finance</b> • Developed with ❤️ by Alif Ihsan & Contributors. Free & Open Source under MIT License.</font>", ParagraphStyle('FooterNote', fontName='Helvetica', fontSize=8, leading=10, alignment=1)))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/home/alifihsan/ai7-finance/docs/Panduan_Pengguna_AI7_Finance.pdf"
    create_guide_pdf(out)
