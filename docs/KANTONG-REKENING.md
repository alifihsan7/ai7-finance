# Kantong per rekening

Kantong adalah pembagian alokasi dalam rekening induk, bukan tambahan saldo kas.

- Pengaturan → Kantong dan Anggaran menampilkan semua rekening induk sebagai tombol yang membungkus ke baris berikutnya. Tombol aktif ditandai secara visual dan dengan `aria-pressed`. Judul mengikuti nama rekening, misalnya “Kantong Bank Uji”.
- Halaman Anggaran memakai komponen pilihan rekening yang sama. Panel amplop lama yang menampilkan rekening utama lagi dihapus dari halaman tersebut; ringkasan tagihan/simpanan tetap terpisah dari daftar kantong.
- Daftar dan ringkasan diminta menggunakan `account_id`. Pergantian rekening memisahkan daftar, formulir, dan permintaan yang masih berjalan.
- “Tambah kantong” mengisi nama, jenis (operasional, tagihan, darurat, tabungan, investasi), dan plafon. Rekening induk ditetapkan dari pilihan aktif.
- “Edit plafon” memperbarui kantong dan memuat ringkasan rekening aktif.
- “Hubungkan tagihan” menggantikan sinkronisasi berdasarkan kata kunci. Pengguna memilih kantong dan satu tagihan aktif dari rekening yang sama. Satu tagihan tidak bisa dihubungkan ke dua kantong.
- Kantong lama tetap mengikuti hubungan rekening yang tersimpan. Tidak ada perpindahan kepemilikan kantong atau perubahan saldo rekening saat membuat kantong.

Plafon kantong yang terhubung mengikuti nominal tagihan secara otomatis, termasuk saat nominal atau nama tagihan diperbarui. Tagihan tahunan memakai nominal per tagihan, bukan nominal yang dibagi per bulan. Edit plafon manual tidak dapat menimpa kantong yang terhubung.

Jika tagihan dinonaktifkan, plafon efektif menjadi 0 dan kartu menampilkan statusnya. Pilih “Atur plafon manual” untuk melepas hubungan dan mempertahankan plafon terakhir (0 bila tagihan nonaktif). Tagihan harus dilepas dari kantong sebelum dihapus atau dipindahkan rekening. Kantong yang terhubung juga harus dilepas sebelum dipindah rekening.

Tidak ada pembayaran atau transaksi ledger baru saat menghubungkan tagihan. Klasifikasi transaksi ke kantong dan perhitungan saldo kas lainnya tetap mengikuti aturan yang sudah ada. Kantong lama tidak otomatis dihubungkan dari namanya; seeding baru juga tidak lagi menebak tagihan. Endpoint sync lama tetap menerima permintaan untuk kompatibilitas, tetapi hanya mengembalikan ringkasan tautan eksplisit tanpa menimpa plafon manual.

Deployment: startup backend menambahkan kolom nullable `jago_pockets.subscription_id` dengan foreign key dan indeks unik per pengguna secara idempotent. Data kantong lama dipertahankan tanpa tautan. Backend dan aset frontend perlu diperbarui bersama, lalu restart production. Upgrade skema diuji menggunakan SQLite; database PostgreSQL production belum dijalankan dari sesi ini.

Validasi lokal: build production; pembuatan kantong dummy Rp1.500.000 di Bank Uji, daftar bertambah dari lima menjadi enam; kantong tersebut tidak muncul saat pindah ke Tagihan Uji.

Edit plafon Tagihan Uji menjadi Rp1.200.000 berhasil dan tidak mengubah daftar maupun plafon kantong Bank Uji. Penghitung mengikuti rekening terpilih. Formulir tambah diperiksa pada layar 390 px tanpa overflow, dan header diperiksa pada lebar sedang. Pemeriksaan regresi overview dan dashboard-data lolos. Peringatan dependensi hook yang sudah ada masih muncul pada build.

Validasi Hubungkan tagihan: 48 tes backend terkait kantong, pembatasan pengguna/rekening, perubahan nominal, tagihan nonaktif, pelepasan hubungan, dan regresi ledger lolos. Build frontend dan kedua skrip regresi dashboard lolos. Uji browser lokal menghubungkan Internet rumah Rp350.000 pada Tagihan Uji, memverifikasi kolom plafon manual terkunci, dan menyimpan melalui dialog HP 390 px. Dialog bersama dirender melalui portal pada root aplikasi supaya animasi panel tidak menarik posisi dialog keluar layar; posisi, fokus keyboard, serta tema terang/gelap diperiksa.
