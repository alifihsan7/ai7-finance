# Kantong per rekening

Kantong adalah pembagian alokasi dalam rekening induk, bukan tambahan saldo kas.

- Pengaturan → Kantong menyediakan pilihan rekening induk. Judul mengikuti nama rekening, misalnya “Kantong Bank Uji”.
- Halaman Anggaran memakai komponen pilihan rekening yang sama. Panel amplop lama yang menampilkan rekening utama lagi dihapus dari halaman tersebut; ringkasan tagihan/simpanan tetap terpisah dari daftar kantong.
- Daftar dan ringkasan diminta menggunakan `account_id`. Pergantian rekening memisahkan daftar, formulir, dan permintaan yang masih berjalan.
- “Tambah kantong” mengisi nama, jenis (operasional, tagihan, darurat, tabungan, investasi), dan plafon. Rekening induk ditetapkan dari pilihan aktif.
- “Edit plafon” memperbarui kantong dan memuat ringkasan rekening aktif.
- Sinkronisasi komitmen lama tetap tersedia pada rekening yang memiliki kantong bawaan Kuota/Claude/Gym. Hasilnya dimuat ulang dengan filter rekening.
- Kantong lama tetap mengikuti hubungan rekening yang tersimpan. Tidak ada perpindahan kepemilikan kantong atau perubahan saldo rekening saat membuat kantong.

Implementasi memakai endpoint backend yang sudah tersedia. Perhitungan saldo/alokasi, klasifikasi transaksi ke kantong, dan perilaku seeding bawaan belum diubah pada iterasi ini.

Validasi lokal: build production; pembuatan kantong dummy Rp1.500.000 di Bank Uji, daftar bertambah dari lima menjadi enam; kantong tersebut tidak muncul saat pindah ke Tagihan Uji.

Edit plafon Tagihan Uji menjadi Rp1.200.000 berhasil dan tidak mengubah daftar maupun plafon kantong Bank Uji. Penghitung mengikuti rekening terpilih. Formulir tambah diperiksa pada layar 390 px tanpa overflow, dan header diperiksa pada lebar sedang. Pemeriksaan regresi overview dan dashboard-data lolos. Peringatan dependensi hook yang sudah ada masih muncul pada build.
