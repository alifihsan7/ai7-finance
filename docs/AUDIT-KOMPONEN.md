# Konsistensi komponen

Tanggal: 2 November 2026. Arah visual: Ink & Silver.

## Temuan dan perbaikan

| Temuan | Perbaikan | Alasan |
| --- | --- | --- |
| Kartu dan dialog memakai radius 16, 20, 24, dan 28 px tanpa peran yang jelas | Token panel 20 px; saldo utama tetap 28 px | Wadah pendukung seragam, saldo utama tetap punya hierarki |
| Kontrol campuran pil dan kotak membulat; tab aktif lebih tinggi | Radius kontrol 10 px dan target minimal 44 px | Bentuk dan ukuran tidak berubah saat dipilih |
| Border putih dengan banyak opacity | Border netral memakai token `luma-smokeline`; kolom input memakai `ai7-field-border` | Pemisah konsisten pada tema terang dan gelap, kolom tetap mudah dikenali |
| Label uppercase, title case, dan sentence case bercampur | Hapus transform uppercase dan tracking lebar; seragamkan label, judul, CTA dan badge peran rekening ke sentence case | Hierarki ditentukan peran teks, bukan kapitalisasi |
| Empat kartu ringkasan memecah nominal rupiah pada lebar sedang | Satu kolom HP, dua kolom ukuran sedang, empat mulai 1440 px; gap 16 px | Memberi ruang untuk nominal |
| Badge kategori dan status Kantong berbentuk pil | Radius badge 6 px | Membedakan label status dari tombol |

Singkatan, nama produk, nama yang dimasukkan pengguna, nilai internal, dan pencocokan data dipertahankan. Avatar dan progress track tetap melingkar. Warna status keuangan tetap bermakna.

## Verifikasi

- Build production lolos; peringatan dependensi hook yang sudah ada tetap muncul.
- Pemeriksaan regresi overview dan dashboard-data lolos.
- Browser desktop pada halaman Transaksi: kartu 20 px, border netral sama, tombol 10 px dan minimal 44 px, tanpa transform uppercase atau overflow halaman.
- Layar 390 px pada tema terang: grid satu kolom, tanpa overflow horizontal halaman. Modal transaksi muat; label memakai sentence case dan kolom 44 px. Input nominal berada di dalam wadah mata uang sehingga sudut input dalam tetap 0 px.
- Pemeriksaan memakai data lokal sementara, bukan data production.
