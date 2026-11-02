# Rencana penyederhanaan fitur ai7.finance

Status: rancangan untuk ditinjau, belum diterapkan.

## Tujuan

Mengurangi menu dan istilah yang tumpang tindih. Fitur utama mengikuti kebutuhan sehari-hari: melihat kondisi uang, mencatat transaksi, mengatur belanja, dan merencanakan kebutuhan berikutnya.

Palet Ink & Silver dan sidebar yang dapat diciutkan tetap digunakan.

## Istilah utama

| Istilah | Fungsi | Contoh |
| --- | --- | --- |
| Rekening | Tempat saldo dicatat | Rekening bank, dompet digital, tunai |
| Kantong Rekening | Pembagian saldo secara virtual di dalam satu rekening | Kantong Harian dan Tagihan dalam rekening pilihan |
| Kategori | Jenis pemasukan atau pengeluaran | Gaji, makan, transportasi |
| Anggaran | Batas belanja untuk kategori dan periode tertentu | Makan Rp600.000 per bulan |
| Alokasi pemasukan | Rencana pembagian uang yang diterima | Membagi pemasukan untuk kebutuhan, tagihan, dan tabungan |
| Target tabungan | Jumlah dana yang ingin dikumpulkan | Dana darurat Rp10.000.000 |
| Tagihan | Kewajiban pembayaran pada tanggal tertentu | Sewa bulanan atau pembayaran sekali bayar |

Kantong bukan rekening bank baru. Membagi saldo ke kantong tidak menambah total uang. Anggaran membatasi belanja; kantong membagi saldo. Keduanya tidak wajib berpasangan satu per satu.

## Susunan navigasi yang diusulkan

| Menu utama | Isi |
| --- | --- |
| Ringkasan | Total saldo, batas belanja harian, transaksi terbaru, tagihan terdekat |
| Transaksi | Pemasukan, pengeluaran, transfer, pencarian, filter, ekspor |
| Anggaran | Batas belanja per kategori, evaluasi pemakaian, alokasi pemasukan |
| Rencana | Target tabungan dan tagihan, dipisahkan dengan tab |
| Laporan | Arus kas, pengeluaran per kategori, perbandingan periode |

Pengaturan menjadi akses sekunder di bagian bawah sidebar, untuk rekening, kategori, profil, dan preferensi. Dari Ringkasan tetap tersedia akses langsung ke daftar rekening.

Kantong Rekening dibuka dari rekening induknya. Kantong tidak menjadi menu utama tambahan. Saat mengalokasikan pemasukan, pengguna dapat memilih rekening dan kantong tujuannya.

## Daftar perubahan fitur

| Fitur sekarang | Rencana perubahan | Jenis perubahan |
| --- | --- | --- |
| Ringkasan | Menjadi pusat informasi harian; menambahkan tagihan terdekat setelah datanya terverifikasi | Isi halaman |
| Buku Transaksi | Diganti nama menjadi Transaksi; tetap mendukung pemasukan, pengeluaran, dan transfer | Nama dan penyajian |
| Alokasi Amplop | Menjadi Anggaran; pembagian berdasarkan kategori dipisahkan dari pembagian saldo rekening | Struktur dan model fitur |
| Kantong Bank Jago | Menjadi Kantong Rekening, dengan rekening induk yang dapat dipilih | Nama dan model data |
| Amplop Mandiri | Diperiksa fungsi dan datanya: batas belanja masuk Anggaran; pembagian saldo masuk Kantong Rekening | Pemetaan data |
| Checklist/alokasi gajian | Menjadi Alokasi pemasukan; dapat dipakai untuk berbagai sumber pemasukan | Nama dan alur |
| Target Finansial | Menjadi Target tabungan, di dalam Rencana | Nama dan lokasi |
| Langganan & Tagihan | Menjadi Tagihan, di dalam Rencana; membedakan berulang dan sekali bayar | Nama, lokasi, dan alur |
| Akun & Kategori | Pengelolaan rekening dan kategori dipisah di Pengaturan; rekening tetap dapat dibuka dari Ringkasan | Navigasi |
| Analisis & Tren | Menjadi Laporan; totalnya harus konsisten dengan Transaksi dan periode terpilih | Nama dan validasi |

Pergantian nama pada tabel ini bukan bukti bahwa fitur di belakangnya sudah mendukung perilaku baru. Kantong generik dan pemisahan anggaran memerlukan perubahan data serta perhitungan.

## Aturan perilaku yang perlu dijaga

- Total saldo dihitung dari rekening. Kantong tidak dijumlahkan lagi sebagai saldo tambahan.
- Jumlah alokasi kantong ditampilkan bersama saldo rekening dan bagian yang belum dialokasikan. Saldo negatif atau alokasi berlebih tidak boleh ditandai aman.
- Pemindahan alokasi antar kantong dalam rekening yang sama tidak dicatat sebagai pemasukan atau pengeluaran baru.
- Transfer antar rekening tetap memperbarui kedua sisi dan menjaga total kas.
- Pengeluaran hanya mengurangi saldo dan pemakaian anggaran satu kali. Jika dikaitkan ke kantong, pengurangannya tetap berasal dari transaksi yang sama.
- Target tabungan yang memakai saldo rekening/kantong tidak menciptakan saldo tambahan.
- Tagihan terjadwal belum dianggap telah dibayar. Pencatatan pembayaran tidak boleh menggandakan pengeluaran yang sudah ada.
- Tampilan dan laporan menggunakan periode yang sama. Perubahan konfigurasi periode tidak boleh diam-diam mengubah riwayat transaksi.

## Keputusan yang belum final

1. Apakah satu transaksi boleh dibagi ke beberapa kantong, atau cukup satu kantong opsional pada tahap pertama?
2. Apakah alokasi kantong berlaku terus sampai diubah, atau memiliki batas per periode?
3. Bagaimana saldo yang sudah terpakai atau negatif ditangani saat memindahkan kantong ke rekening lain?
4. Apakah target tabungan hanya membaca saldo rekening/kantong, atau juga mendukung setoran manual yang terhubung ke transaksi?
5. Bagaimana data Amplop Mandiri dan Kantong Jago saat ini dipetakan tanpa mengubah nilai serta riwayatnya?

Usulan awal: satu kantong opsional per transaksi, kantong tetap berada pada rekening induknya, dan riwayat lama tidak diubah otomatis. Keputusan ini perlu ditinjau sebelum perubahan model data.

## Urutan pengerjaan

### Tahap 1 — Struktur dan istilah

Rapikan navigasi, nama fitur, dan pengelompokan halaman. Pertahankan alamat halaman lama sebagai pengalihan. Hindari perubahan perhitungan atau migrasi data pada tahap ini. Istilah generik baru dipakai pada fitur yang benar-benar sudah mendukungnya.

### Tahap 2 — Kantong Rekening

Periksa model kantong dan amplop yang ada, susun pemetaan data, lalu tambahkan hubungan rekening induk. Uji alokasi, saldo belum dialokasikan, pengeluaran, perubahan periode, dan saldo negatif dengan data lokal. Migrasi production memerlukan rencana cadangan dan pemulihan yang konkret.

### Tahap 3 — Anggaran dan alokasi pemasukan

Pisahkan batas belanja kategori dari pembagian saldo. Hubungkan sumber pemasukan dengan rekening/kantong tujuan. Verifikasi nominal pembagian, sisa pembulatan, dan batas belanja harian.

### Tahap 4 — Rencana dan laporan

Satukan akses target tabungan dan tagihan. Verifikasi pencatatan pembayaran, progres target, dan kecocokan laporan terhadap transaksi.

## Kriteria selesai

- Menu utama mengikuti susunan baru dan tautan lama tetap dapat digunakan.
- Istilah rekening, kantong, kategori, anggaran, dan target memiliki fungsi yang berbeda serta konsisten di seluruh halaman.
- Tidak ada saldo atau transaksi yang dihitung dua kali.
- Nilai serta riwayat data lama tetap terjaga setelah migrasi yang diuji.
- Mode terang/gelap dan layar HP tetap dapat dipakai.
- Setiap tahap memiliki catatan perubahan dan hasil pengujian sebelum dilanjutkan ke tahap berikutnya.

## Batas pekerjaan saat dokumen ini dibuat

Dokumen ini hanya mencatat rancangan. Belum ada perubahan navigasi, model data, migrasi, maupun data production dari rencana ini. Implementasi dijalankan per tahap agar perubahan dapat diperiksa dan penggunaan kuota lebih terkendali.
