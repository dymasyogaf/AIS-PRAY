# Panduan Penggunaan Aplikasi AIS-PRAY (AIdah - Aplikasi Ibadah)

## 1. Pendahuluan
Aplikasi **AIS-PRAY** adalah sistem pemantauan dan pencatatan ibadah harian bagi para Santri dan Santriwati. Aplikasi ini memfasilitasi peran Santri dalam mencatat aktivitas ibadahnya serta memberikan akses bagi Musyrif/Musyrifah (Pembina) untuk memantau, mengevaluasi, dan memberikan pembinaan secara langsung.

## 2. Peran Pengguna (Role)
- **Santri / Santriwati:** Pengguna yang memiliki kewajiban untuk melakukan input catatan ibadah harian (sholat, tilawah, tahfidz, qiyamul lail, puasa, dan adab).
- **Musyrif / Musyrifah:** Pembina/Ustadz/Ustadzah yang bertugas memonitor seluruh santri binaannya, melihat tren ibadah, memberikan catatan pembinaan, dan mengelola daftar santri yang memerlukan bimbingan.

## 3. Fitur Utama & Navigasi Halaman

### A. Halaman Login
*   Pengguna dapat masuk menggunakan Username/NISN dan Password yang telah terdaftar.
*   Sistem akan secara otomatis mendeteksi peran (Santri atau Pembina) saat login untuk mengarahkan ke tampilan yang sesuai.

### B. Dashboard / Beranda
*   **Bagi Santri:**
    *   Menampilkan sapaan harian personal.
    *   **Notifikasi Wajib Input:** Pop-up peringatan jika Santri belum mengisi data ibadah pada hari tersebut.
    *   **Ringkasan Aktivitas:** Menampilkan ringkasan ibadah hari ini (jumlah sholat on-time, menit tilawah, hafalan tahfidz, dan rakaat qiyamul lail).
    *   **Grafik Statistik:** Tren durasi Tilawah selama 14 hari terakhir untuk melacak konsistensi.
    *   **Pemberitahuan:** Terdapat ikon lonceng untuk mengecek apakah ada catatan/pesan baru dari Pembina.
*   **Bagi Pembina (Musyrif/ah):**
    *   Ringkasan kondisi seluruh santri binaan hari ini (Rata-rata skor kelas, jumlah input yang sudah masuk).
    *   **Top 5 Santri:** Menampilkan daftar 5 santri dengan rekor ibadah terbaik pada minggu ini.
    *   Tabel status harian per santri beserta skor total ibadahnya, lengkap dengan indikator warna status.

### C. Halaman Input Ibadah
*   *Halaman khusus Santri.*
*   Berisi formulir harian untuk mencatat detail pelaksanaan ibadah:
    *   **Sholat Wajib 5 Waktu:** Dipilih berdasarkan status pelaksanaan (On-time / Telat / Tidak Sholat).
    *   **Tilawah:** Durasi membaca Al-Qur'an (dalam satuan menit).
    *   **Tahfidz:** Jumlah halaman ziyadah (hafalan baru) dan murajaah (pengulangan hafalan).
    *   **Qiyamul Lail:** Jumlah rakaat sholat tahajud/malam.
    *   **Puasa Sunnah:** Pilihan Ya / Tidak (seperti puasa Senin-Kamis atau Ayyamul Bidh).
    *   **Adab:** Penilaian mandiri terhadap 5 pilar adab (Maksimal 5 poin).

### D. Rekapitulasi (Riwayat)
*   Menampilkan riwayat input ibadah lengkap berdasarkan urutan tanggal.
*   **Bagi Santri:** Dapat melihat kembali rekam jejak ibadahnya di hari-hari sebelumnya, dan dapat membaca langsung *feedback* atau pesan dari Pembina di riwayat hari tersebut.
*   **Bagi Pembina:** Disediakan fitur pencarian/filter nama santri untuk memeriksa riwayat secara spesifik. Di halaman ini, Pembina bisa **memberikan catatan pembinaan** secara langsung ke form harian milik santri.

### E. Ranking (Papan Peringkat)
*   Papan peringkat (*Leaderboard*) yang menampilkan skor ibadah tertinggi.
*   Fitur ini dibuat untuk memotivasi santri agar terus konsisten berlomba-lomba dalam kebaikan. Skor diakumulasi secara otomatis dari sistem berdasarkan kedisiplinan (terutama Sholat On-time).

### F. Butuh Pembinaan
*   *Halaman khusus Pembina (Musyrif/ah).*
*   Sistem secara otomatis mendeteksi dan menampilkan daftar santri yang mengalami penurunan kualitas ibadah, yakni mereka yang mendapatkan skor sangat rendah atau tidak mengisi selama **3 kali berturut-turut** (Pembinaan Streak).
*   Membantu ustadz/ustadzah memprioritaskan santri mana yang perlu segera dipanggil untuk konseling atau penanganan khusus.

### G. Manajemen Profil
*   Halaman manajemen akun bagi setiap pengguna.
*   Dapat digunakan untuk memperbarui informasi personal seperti pembaruan Username, pengaturan Password baru, dan memperbarui data Asrama, Kelas, serta Jurusan.

## 4. Alur Penggunaan (Workflow) Standar
1.  **Aktivitas Santri:** Login setiap hari -> Mengisi formulir ibadah di menu **Input** (atau melalui tombol cepat di Beranda) -> Melihat perkembangan grafik ibadahnya di **Beranda** -> Mengecek **Notifikasi/Rekap** untuk membaca pesan motivasi/teguran dari ustadz/ustadzah.
2.  **Aktivitas Pembina:** Login -> Memeriksa **Beranda** untuk melihat persentase partisipasi santri hari ini -> Masuk ke menu **Butuh Pembinaan** untuk melihat daftar santri bermasalah -> Membuka halaman **Rekap** santri tersebut -> Memberikan catatan/pesan pada riwayat ibadahnya untuk perbaikan.

## 5. Sistem Penilaian (Skoring)
Aplikasi menerapkan logika skor secara otomatis setiap kali data disimpan:
- **Sholat On-time** memiliki nilai bobot yang paling tinggi dalam menunjang skor harian.
- Kegiatan sunnah seperti **Tilawah, Tahfidz, Qiyamul Lail, Puasa, dan Adab** turut menyumbang poin tambahan untuk mencapai nilai rata-rata 100.
- Jika skor keseluruhan tidak mencapai batas minimum (misal: < 80), sistem akan menyesuaikan status warna pada tabel Pembina, dan bisa memicu deteksi "Butuh Pembinaan" jika berulang.

---
*Panduan Penggunaan Aplikasi AIS-PRAY - Dicetak otomatis melalui sistem*
