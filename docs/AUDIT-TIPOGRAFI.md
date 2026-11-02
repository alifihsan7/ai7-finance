# Audit tipografi ai7.finance

Tanggal: 2 November 2026. Status: audit awal dan tindak lanjut implementasi.

## Lingkup dan metode

Memeriksa sumber font, kelas komponen, aturan CSS, serta computed styles pada preview lokal: Ringkasan, Transaksi, Anggaran, Rencana (Target dan Tagihan), Laporan, Pengaturan/Kantong, dan modal Tambah Target. Data yang diperiksa adalah data uji lokal. Ukuran aktual di bawah berasal dari tampilan desktop saat audit; seluruh variasi HP dan keadaan kartu berisi data belum diukur.

Font yang dimuat adalah Geist Sans dan Geist Mono lokal. Tidak ditemukan bukti bahwa font utama gagal dimuat; perbedaannya berasal dari pemakaian font dan aturan komponen.

## Temuan

### 1. Sedang — Angka keuangan berganti jenis font antarhalaman

Ringkasan memakai Geist Sans untuk saldo dan arus kas. Ringkasan Target, Tagihan, Transaksi, Laporan, dan Kantong masih memakai Geist Mono. Akibatnya angka rupiah dengan fungsi serupa terasa berasal dari dua sistem desain.

Contoh computed styles:

| Peran | Jenis font | Ukuran desktop | Ketebalan |
| --- | --- | --- | --- |
| Saldo utama Ringkasan | Geist Sans | responsif, sekitar 35 px pada viewport audit | 500 |
| Total target tabungan | Geist Mono | 30 px | 800 |
| Total komitmen tagihan | Geist Mono | 24 px | 900 |
| Total kas pada Transaksi | Geist Mono | 24 px | 900 |
| Ringkasan Laporan | Geist Mono | 24 px | 900 |
| Sisa saldo Kantong | Geist Mono | 24 px | 800 |

Saldo utama boleh lebih besar daripada metrik pendukung. Masalahnya adalah pergantian keluarga font serta bobot yang tidak memiliki pembagian peran konsisten.

Lokasi: `GoalsView.tsx:170`, `SubscriptionsView.tsx:58`, `AnalyticsView.tsx:136`, `JagoPockets.tsx:270`, serta metrik di `TransactionLedgerView.tsx`.

Acuan antislop: R-06, alasan pemilihan tipografi; R-31, keputusan visual yang dapat dijelaskan. `DESIGN.md` menetapkan sans lokal untuk nominal rupiah dan penggunaan tabular numerals.

### 2. Sedang — Kartu metrik sejenis memakai ukuran dan bobot berbeda

Target menampilkan total pada 30 px/800, sedangkan Tagihan menampilkan total pada 24 px/900. Kedua kelompok berada di halaman Rencana dan sama-sama merupakan ringkasan angka. Ukuran yang lebih kecil justru lebih tebal, sehingga urutan perhatian tidak konsisten.

Bobot 400, 500, 600, 700, 800, dan 900 masih muncul bersamaan. Aturan global mengubah bobot heading menjadi 500, tetapi tidak menyamakan angka dalam `div` dan `span`.

Rekomendasi: tentukan peran metrik bersama, bukan menyamakan semua angka di seluruh aplikasi. Gunakan 28 px/600 untuk metrik desktop dan 24 px/600 di HP; saldo utama tetap memiliki peran tersendiri.

Acuan: R-06 dan R-31.

### 3. Sedang — Informasi keuangan pendukung terlalu kecil dan padat

Label Masuk/Keluar dan nominal arus kas pada Ringkasan berukuran 11 px. Plafon/Pakai pada Kantong juga 11 px; penghitung tab berukuran 10 px. Sumber dan gaya terhitung juga memuat teks 9 px pada bagian laporan/rincian. Detail ini perlu diprioritaskan berdasarkan fungsi, bukan dianggap sekadar dekorasi.

Rekomendasi: gunakan 14 px untuk isi utama/tabel dan 12 px untuk metadata, badge, serta keterangan pendukung. Jangan menyatakan ukuran kecil otomatis melanggar WCAG; temuan ini terkait keterbacaan dan kepadatan. Uji kembali pada HP dan zoom 200% sebelum menetapkan pengecualian label grafik.

Lokasi: `globals.css:369`, `globals.css:377`, `JagoPockets.tsx:291`, `PeriodSelector.tsx:211`, dan penghitung tab di `page.tsx`.

Acuan: R-39, ketahanan dan aksesibilitas interaksi; R-31, alasan keputusan visual. Kegagalan zoom belum dibuktikan dalam audit ini.

### 4. Rendah — Skala judul bagian belum memiliki peran yang jelas

Judul panel Ringkasan memakai 13–14 px. Judul bagian Target memakai 20 px, sedangkan bagian Tagihan 18 px. Tidak semua heading harus sama besar, tetapi perbedaan label kartu, judul panel, dan judul bagian belum ditetapkan sebagai token yang konsisten.

Rekomendasi: bedakan label metrik 12 px, judul kartu 16 px, dan judul bagian 18 px. Pertahankan satu peran judul halaman. Hindari memperbaiki melalui override `h2`/`h3` global karena elemen HTML yang sama dapat memiliki fungsi berbeda.

Lokasi: `globals.css:375`, `GoalsView.tsx`, `SubscriptionsView.tsx`, dan heading halaman di `page.tsx`.

Acuan: R-06 dan R-31.

### 5. Rendah — Normalisasi CSS hanya menjangkau sebagian kartu

Aturan `.ai7-account-card .font-mono`, `.ai7-category-card .font-mono`, dan `.ai7-goal-card .font-mono` mengembalikan font ke sans. Namun ringkasan metrik Target berada di luar `.ai7-goal-card`; Tagihan, Kantong, dan ringkasan Transaksi juga tidak tercakup. Akibatnya perubahan terdahulu terlihat selesai pada sebagian kartu, tetapi sisa komponen tetap menggunakan gaya lama.

Rekomendasi: definisikan kelas berdasarkan peran seperti judul halaman, judul bagian, metrik, nominal tabel, label, dan metadata. Terapkan langsung di komponen. Hapus kelas lama yang bertentangan setelah penggantinya selesai; jangan menambah lapisan override global lagi.

Lokasi: aturan tipografi kartu di `globals.css` dan kelas `font-mono`/`font-black` pada komponen yang disebut di atas.

Acuan: R-31, keputusan visual yang disengaja.

## Bagian yang sudah konsisten

- Judul halaman yang diperiksa: Geist Sans 30 px, bobot 500, line-height 36 px.
- Modal bersama: label 12 px/500 dan kolom input 16 px. Dropdown serta tombol preset yang diperiksa memakai sans 14 px/500.
- Tabular numerals sudah tersedia untuk merapikan kolom angka; monospace tidak diperlukan untuk tujuan tersebut.

## Skala yang diusulkan

Semua teks antarmuka dan nominal uang memakai Geist Sans. Geist Mono dibatasi untuk kode atau ID teknis bila memang perlu ditampilkan. Tidak perlu mengunduh font baru.

| Peran | Desktop | HP | Bobot | Line-height |
| --- | --- | --- | --- | --- |
| Judul halaman | 30 px | 24 px | 500 | 1,2 |
| Judul bagian | 18 px | 18 px | 600 | 1,4 |
| Judul kartu | 16 px | 16 px | 500 | 1,4 |
| Isi dan baris tabel | 14 px | 14 px | 400 | 1,5 |
| Tombol dan tab | 14 px | 14 px | 500 | 1,4 |
| Label, metadata, badge | 12 px | 12 px | 400–500 sesuai peran | 1,4 |
| Kolom input | 16 px | 16 px | 400; nominal 500 | 1,5 |
| Metrik ringkasan | 28 px | 24 px | 600 | 1,2 |
| Saldo utama | 36 px | 28 px | 500 | 1,2 |

Nominal memakai `font-variant-numeric: tabular-nums`. Bobot dasar cukup 400, 500, dan 600. Keterangan grafik boleh memiliki aturan khusus setelah diuji pada ruang yang tersedia, bukan dengan mengecilkan semua label.

## Urutan perbaikan yang disarankan

1. Satukan keluarga font dan bobot nominal pada metrik Target, Tagihan, Transaksi, Laporan, dan Kantong.
2. Terapkan token ukuran berdasarkan peran; pertahankan saldo utama sebagai pengecualian yang disengaja.
3. Perbesar metadata ke 12 px dan pastikan nominal/tanggal penting tidak terpotong.
4. Bersihkan kelas dan override lama yang bertentangan.
5. Periksa kedua tema, HP/desktop, nominal rupiah panjang, keadaan kosong/berisi, dan zoom 200%.

Temuan di atas merekam keadaan sebelum perbaikan.

## Tindak lanjut implementasi

- Geist Sans dipakai untuk teks antarmuka dan nominal. Kelas monospace, bobot 700–900, dan metadata 9–11 px dibersihkan dari komponen UI.
- Token peran judul, metrik, dan nominal tabel dipusatkan di `globals.css`; acuan diperbarui di `DESIGN.md`.
- Grid Kantong menyesuaikan ruang dengan lebar minimum kartu 280 px (atau lebar layar bila lebih sempit). Plafon/Pakai disusun per baris agar nominal panjang tidak keluar kartu.
- Build production dan dua pemeriksaan regresi frontend (`check-overview.cjs`, `check-dashboard-data.cjs`) lolos. Peringatan dependensi hook yang sudah ada masih muncul.
- Pemeriksaan browser: Target, Tagihan, Transaksi, dan Laporan memakai metrik 28 px/600 di desktop; Target dan Tagihan 24 px/600 di HP. Modal Tambah Target memakai input 16 px.
- Tema terang dan gelap diperiksa. Nominal uji Rp 9.000.000.000.000.000 tidak menyebabkan overflow pada Ringkasan/Kantong di HP; kartu Kantong juga diperiksa pada desktop 1280 px dan layar 320 px.
- Pengujian memakai data lokal sementara. Zoom browser 200% belum diuji langsung; layar 320 px diperiksa sebagai pengujian reflow. Data dan perhitungan keuangan production tidak diubah.
