const PDFDocument = require("pdfkit");
const fs = require("fs");

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream("Panduan_Admin_AISPRAY.pdf"));

doc.fontSize(20).text("Panduan Penggunaan Sistem AIS-PRAY", { align: "center" });
doc.fontSize(14).text("(Khusus Administrator)", { align: "center" });
doc.moveDown();

doc
  .fontSize(12)
  .text(
    "Selamat datang di sistem rekapitulasi ibadah AIS-PRAY. Dokumen ini dikhususkan untuk Administrator yang bertugas memantau seluruh data santri (Putra) dan santriwati (Putri) secara menyeluruh.",
    { align: "justify" },
  );
doc.moveDown();

doc.fontSize(16).text("1. Informasi Akses (Login)");
doc.fontSize(12)
  .text(`Akun administrator ini bersifat rahasia dan tidak terdaftar di daftar akun publik. Anda hanya bisa mengaksesnya menggunakan kredensial khusus berikut:
- Halaman Login: Buka aplikasi AIS-PRAY dan masuk ke halaman Login utama.
- Username: AdminAISPray
- Password: @JadiBaik2030

(Perhatian: Jangan berikan informasi login ini kepada santri atau musyrif/ah biasa).`);
doc.moveDown();

doc.fontSize(16).text("2. Hak Akses & Kemampuan Utama Administrator");
doc.fontSize(12)
  .text(`Berbeda dengan Musyrif (yang hanya mengurus Putra) dan Musyrifah (yang hanya mengurus Putri), Administrator memiliki akses "Super User".
Sebagai Admin, Anda dapat:
- Melihat seluruh data dari semua asrama dan semua kelas sekaligus.
- Melakukan pemfilteran data spesifik berdasarkan gender (Semua, Khusus Putra, atau Khusus Putri).
- Mengubah status tindak lanjut untuk santri/santriwati yang butuh pembinaan.`);
doc.moveDown();

doc.fontSize(16).text("3. Penjelasan Fitur dan Menu Admin");
doc.fontSize(14).text("A. Dashboard (Ringkasan)");
doc.fontSize(12)
  .text(`Halaman pertama setelah Anda login. Di sini Anda bisa melihat ringkasan kondisi kedisiplinan secara keseluruhan.
- Filter Gender: Terdapat tombol dropdown di kanan atas. Anda bisa memilih untuk melihat statistik gabungan ("Semua"), khusus "Santri (Putra)", atau khusus "Santriwati (Putri)".
- Tren Rata-rata 14 Hari: Menampilkan grafik garis rata-rata skor ibadah dalam 2 minggu terakhir.
- Top 5 Santri/Santriwati: Melihat 5 orang dengan skor tertinggi minggu ini.`);
doc.moveDown();

doc.fontSize(14).text("B. Data Setoran");
doc.fontSize(12)
  .text(`Menu ini difokuskan untuk memantau setoran hafalan (Tahfidz) dan bacaan Al-Quran (Tilawah).
- Filter Rentang Waktu: Anda bisa melihat data 7 hari, 14 hari, atau 30 hari terakhir.
- Filter Gender & Individu: Anda bisa memfilter berdasarkan jenis kelamin, atau menelusuri nama santri secara spesifik melalui dropdown pencarian.
- Grafik Setoran: Grafik batang yang menunjukkan fluktuasi setoran harian secara keseluruhan.`);
doc.moveDown();

doc.fontSize(14).text("C. Ranking");
doc.fontSize(12).text(`Melihat urutan (peringkat) berdasarkan kedisiplinan dan skor ibadah harian.
- Filter Asrama: Anda bisa melihat ranking secara global (semua asrama) atau melihat persaingan ranking di satu asrama tertentu.
- Menggunakan filter gender di sudut kanan atas untuk melihat ranking putra dan putri secara terpisah.`);
doc.moveDown();

doc.addPage();

doc.fontSize(14).text("D. Santri (Khusus Putra)");
doc.fontSize(12).text(`- Menampilkan daftar seluruh santri laki-laki yang terdaftar di sistem.
- Klik pada salah satu nama santri untuk membuka halaman "Rekap" yang memperlihatkan kalender detail ibadah dan catatan pembina khusus untuk santri tersebut.`);
doc.moveDown();

doc.fontSize(14).text("E. Santriwati (Khusus Putri)");
doc.fontSize(12).text(`- Menampilkan daftar seluruh santri perempuan yang terdaftar di sistem.
- Fitur ini sangat berguna untuk memisahkan pengawasan area putra dan putri tanpa perlu login ke akun yang berbeda.`);
doc.moveDown();

doc.fontSize(14).text("F. Butuh Pembinaan");
doc.fontSize(12)
  .text(`Menu peringatan dini (Early Warning System) untuk mendeteksi santri yang mulai kendur kedisiplinannya.
- Kriteria: Santri/Santriwati akan otomatis masuk ke daftar ini jika skor harian mereka di bawah standar selama 3 hari berturut-turut.
- Tindak Lanjut (Follow-up): Di kolom keterangan, Admin (atau Musyrif/ah) dapat mengubah status penanganan menjadi Belum, Proses, atau Selesai.`);
doc.moveDown();

doc.fontSize(16).text("4. Tips Pemantauan untuk Admin");
doc.fontSize(12)
  .text(`1. Rutin Cek Menu Butuh Pembinaan: Pastikan tidak ada santri yang berstatus Belum dalam waktu yang lama.
2. Perhatikan Tren di Dashboard: Jika grafik tren 14 hari menunjukkan penurunan tajam, Anda bisa segera mengadakan evaluasi massal.
3. Logout Setelah Selesai: Pastikan untuk selalu menekan tombol Logout di kiri bawah sebelum meninggalkan perangkat Anda.`);

doc.end();
