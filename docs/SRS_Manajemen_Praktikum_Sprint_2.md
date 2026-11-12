# SRS Sistem Manajemen Praktikum Sprint 2

## Dasar Penyusunan

Sprint 2 mengubah aplikasi demonstrasi Sprint 1 menjadi aplikasi multi-pengguna dengan data persisten. Firebase Authentication menjadi sumber identitas pengguna, Cloud Firestore menjadi penyimpanan utama sekaligus sumber sinkronisasi real-time, dan layanan AI hanya memberi klasifikasi pendukung untuk alasan izin. Keputusan izin tetap dibuat oleh Asisten.

Dokumen ini menjadi acuan kebutuhan, acceptance criteria, kontrak data, batas akses, dan pembagian integrasi Sprint 2. Istilah **Praktikan** pada UI dapat memakai nilai peran teknis `student`; **Asisten** memakai nilai `assistant`.

## 1 Pendahuluan dan Ruang Lingkup

### 1.1 Tujuan

Menyediakan aplikasi React Native Expo yang memungkinkan Praktikan dan Asisten memakai akun masing-masing, mengakses data praktikum yang sama sesuai kewenangannya, dan melihat perubahan relevan tanpa memuat ulang halaman.

### 1.2 Gambaran Sistem

Setelah registrasi atau login, pengguna memperoleh profil Firestore yang memuat identitas dan peran. Asisten mengelola kelas serta sesi praktikum, membuka atau menutup sesi, melihat rekap presensi, dan memeriksa pengajuan izin. Praktikan melihat kelas dan jadwal yang diikutinya, melakukan presensi pada sesi yang sedang dibuka, serta mengajukan dan memantau izin. Listener Firestore memperbarui layar terkait ketika data berubah dari perangkat lain.

### 1.3 In Scope

- Registrasi, login, pemulihan state login, dan logout dengan Firebase Authentication berbasis email dan kata sandi.
- Profil pengguna Firestore dengan peran `assistant` atau `student` serta identitas seperti nama, NIM atau kode Asisten.
- Akses dan navigasi berbasis peran, termasuk penolakan layar atau aksi yang tidak berwenang.
- CRUD kelas, anggota kelas, jadwal, dan sesi oleh Asisten yang berwenang.
- Jadwal dan detail sesi yang hanya relevan bagi Praktikan yang terdaftar pada kelasnya.
- Pembukaan dan penutupan sesi oleh Asisten, presensi satu kali per Praktikan per sesi, dan rekap kehadiran real-time.
- Pengajuan izin untuk sesi tertentu, klasifikasi alasan melalui layanan AI, dan keputusan manual oleh Asisten.
- Validasi input, state belum login, loading, kosong, offline atau gangguan koneksi, kesalahan Firebase, serta kegagalan layanan AI.
- Firebase Security Rules untuk membatasi baca dan tulis berdasarkan identitas, peran, keanggotaan kelas, dan kepemilikan data.

### 1.4 Out of Scope

- Reset kata sandi, verifikasi email, login sosial, dan manajemen akun oleh admin.
- Notifikasi push, QR code, geolokasi, unggah berkas bukti izin, ekspor laporan, dan penilaian praktikum.
- Keputusan izin otomatis, rekomendasi yang mengikat, atau pelatihan model AI.
- Dashboard analitik lintas kelas, multi-tenant institusi, dan penghapusan akun.
- Dukungan konflik offline yang melampaui perilaku SDK Firestore; aplikasi wajib memberi status dan memuat ulang data server saat koneksi kembali.

## 2 Aktor dan Hak Akses

| Fitur | Belum login | Praktikan | Asisten |
|---|:---:|:---:|:---:|
| Registrasi dan login | Ya | - | - |
| Logout dan lihat profil sendiri | - | Ya | Ya |
| Lihat kelas atau jadwal terkait | - | Ya, kelas sendiri | Ya, kelas yang dikelola |
| Kelola kelas, anggota, dan sesi | - | Tidak | Ya |
| Buka atau tutup sesi | - | Tidak | Ya, sesi kelasnya |
| Buat presensi | - | Ya, diri sendiri dan sesi terbuka | Tidak |
| Lihat rekap presensi | - | Hanya riwayat sendiri | Ya, sesi kelasnya |
| Ajukan izin | - | Ya, diri sendiri | Tidak |
| Lihat dan putuskan izin | - | Hanya pengajuan sendiri | Ya, sesi kelasnya |

Firebase Security Rules adalah pengendalian akses utama. Pembatasan UI hanya pelengkap pengalaman pengguna dan tidak boleh dianggap sebagai pengaman tunggal.

## 3 Terminologi dan Status

| Istilah | Arti |
|---|---|
| Profil pengguna | Dokumen Firestore yang melengkapi UID Firebase Authentication dengan nama, identitas, dan peran. |
| Kelas | Kelompok praktikum yang memiliki nama, praktikum, dan anggota. |
| Sesi | Pertemuan praktikum milik satu kelas pada tanggal dan waktu tertentu. |
| Status sesi | `scheduled`, `open`, atau `closed`. |
| Presensi | Catatan kehadiran satu Praktikan pada satu sesi. |
| Pengajuan izin | Permintaan ketidakhadiran Praktikan untuk satu sesi. |
| Status izin | `pending`, `approved`, atau `rejected`. |
| Klasifikasi AI | Kategori dan/atau tingkat keyakinan hasil API AI; tidak mengubah status izin. |
| Waktu server | `serverTimestamp` atau timestamp yang ditulis server, bukan jam perangkat. |

## 4 Aturan Bisnis

1. Setiap akun Firebase Authentication harus memiliki satu profil pada `users/{uid}`. Peran hanya `student` atau `assistant` dan tidak boleh diubah dari klien setelah profil dibuat.
2. Praktikan hanya dapat membaca kelas tempat ia terdaftar. Asisten hanya dapat mengelola kelas yang tercatat dalam daftar `assistantIds` kelas tersebut.
3. Alur status sesi adalah `scheduled` -> `open` -> `closed`. Sesi tertutup tidak dapat dibuka kembali pada Sprint 2.
4. Praktikan hanya dapat presensi ketika sesi `open`, menjadi anggota kelas sesi, dan belum memiliki presensi untuk sesi tersebut.
5. Satu presensi unik ditetapkan oleh ID dokumen deterministik `{sessionId}_{studentId}`. Aturan Firestore hanya mengizinkan pembuatan pertama; presensi tidak dapat diubah atau dihapus dari aplikasi.
6. Presensi, pembukaan/penutupan sesi, dan keputusan izin menggunakan waktu server. UI dapat menampilkan format lokal, tetapi tidak menyamakan waktu perangkat sebagai sumber kebenaran.
7. Praktikan dapat membuat satu pengajuan izin per sesi dengan ID `{sessionId}_{studentId}`. Pengajuan yang sudah dibuat tidak diubah atau dihapus Praktikan pada Sprint 2; keputusan Asisten menjadi hasil akhir.
8. Klasifikasi AI dapat bernilai `pending`, `success`, atau `failed`. Jika gagal atau habis waktu, pengajuan tetap disimpan sebagai `pending` dan tetap dapat diperiksa Asisten.
9. Hasil AI hanya informasi pendukung. Status izin tidak boleh berubah otomatis dari `pending` ke `approved` atau `rejected` akibat respons AI.
10. Asisten hanya dapat menerima atau menolak izin yang sesi dan kelasnya ia kelola. Keputusan menyimpan `reviewedBy`, `reviewedAt`, `decision`, dan catatan opsional.
11. Listener Firestore harus dibersihkan saat layar tidak lagi aktif atau komponen unmount agar tidak terjadi listener ganda.
12. Data yang berhasil ditulis ke Firestore tetap tersedia setelah aplikasi ditutup dan dibuka lagi. UI harus membedakan data cache/offline dari kesalahan tulis bila SDK menyediakan status tersebut.

## 5 Alur Interaksi Utama

### 5.1 Autentikasi dan Pengarahan Peran

Pengguna membuka aplikasi -> state autentikasi diperiksa -> jika belum login, tampilkan Login dan Registrasi -> registrasi membuat akun Authentication lalu profil Firestore -> profil dimuat -> pengguna diarahkan ke beranda Praktikan atau Asisten. Jika profil gagal dibuat atau peran tidak valid, sesi tidak boleh masuk ke area terlindungi dan tampilkan tindakan coba lagi/logout.

### 5.2 Kelola Sesi dan Presensi

Asisten login -> memilih kelas -> membuat atau melihat sesi -> membuka sesi `scheduled` -> listener memperbarui status sesi pada Praktikan terdaftar -> Praktikan login dan membuka detail sesi -> menekan Presensi -> aplikasi memvalidasi peran, status, keanggotaan, dan dokumen presensi -> Firestore membuat presensi -> listener rekap Asisten dan riwayat Praktikan menampilkan data baru -> Asisten menutup sesi -> Praktikan tidak dapat presensi lagi.

### 5.3 Izin dan Klasifikasi AI

Praktikan login -> membuka sesi yang diikutinya -> memilih Ajukan Izin -> menulis alasan yang valid -> aplikasi membuat pengajuan `pending` di Firestore -> aplikasi memanggil layanan AI melalui endpoint aman -> hasil kategori atau kegagalan disimpan pada pengajuan -> Asisten melihat daftar izin real-time -> meninjau alasan dan hasil AI -> memilih Terima atau Tolak -> Firestore menyimpan keputusan -> Praktikan melihat perubahan status tanpa reload.

## 6 Kebutuhan Fungsional

### 6.1 Autentikasi dan Profil

**FR-01 Registrasi.** Sistem menyediakan formulir nama, email, kata sandi, konfirmasi kata sandi, peran, dan identitas akademik. Setelah valid, sistem membuat akun Firebase Authentication dan profil pengguna. Kegagalan salah satu langkah ditampilkan dengan pesan yang dapat ditindaklanjuti.

**FR-02 Login dan Logout.** Pengguna dapat login menggunakan email dan kata sandi serta logout dari akun aktif. Saat aplikasi dibuka, state autentikasi dipulihkan; setelah logout, data privat tidak boleh tetap tampil pada UI.

**FR-03 Profil dan Akses Berbasis Peran.** Sistem memuat profil sesuai UID, menampilkan identitas aktif, dan menyediakan navigasi serta aksi sesuai peran. Layar dan aksi terlarang tidak boleh dapat diakses hanya dengan memasukkan route secara manual.

### 6.2 Data Praktikum

**FR-04 CRUD Kelas dan Anggota.** Asisten yang berwenang dapat membuat, melihat, mengubah, dan menghapus kelas miliknya, serta menambah atau menghapus anggota kelas. Form memvalidasi field wajib, nama, dan identitas anggota. Penghapusan kelas harus meminta konfirmasi dan hanya dilakukan bila kebijakan data turunan telah dipenuhi; pada Sprint 2, gunakan penghapusan terkontrol oleh owner data agar tidak meninggalkan data yatim.

**FR-05 CRUD Sesi.** Asisten dapat membuat, melihat, mengubah, dan menghapus sesi milik kelas yang dikelolanya. Sesi memuat kelas, judul atau topik, jadwal mulai/selesai, lokasi, dan status. Penghapusan sesi hanya diizinkan sebelum ada presensi atau pengajuan izin; selain itu aplikasi menolak dan menjelaskan alasannya.

**FR-06 Jadwal Praktikan.** Praktikan dapat melihat daftar dan detail sesi dari kelas yang diikutinya, termasuk praktikum, kelas, waktu, lokasi, status, dan informasi Asisten. Praktikan tidak melihat atau memodifikasi data kelas lain.

### 6.3 Sesi dan Presensi

**FR-07 Buka dan Tutup Sesi.** Asisten dapat membuka sesi `scheduled` dan menutup sesi `open` setelah konfirmasi. Sistem menolak transisi status yang tidak sah, menyimpan UID Asisten serta waktu server, dan memperbarui seluruh listener terkait.

**FR-08 Presensi Praktikan.** Praktikan terdaftar dapat melakukan presensi pada sesi `open`. Sistem membuat satu dokumen presensi dengan UID Praktikan, UID sesi, ID kelas, dan waktu server. Percobaan kedua pada sesi sama tidak membuat atau menimpa data dan menampilkan bahwa presensi telah tercatat.

**FR-09 Rekap Kehadiran.** Asisten dapat melihat rekap presensi per sesi secara real-time, termasuk nama Praktikan, identitas, dan waktu hadir. Praktikan hanya dapat melihat riwayat presensinya sendiri. Kedua layar memiliki state loading dan empty yang eksplisit.

### 6.4 Izin dan AI

**FR-10 Ajukan Izin.** Praktikan dapat mengajukan izin untuk sesi kelasnya dengan alasan wajib yang tervalidasi. Sistem menyimpan pengajuan berstatus `pending`, status klasifikasi AI, dan waktu server; Praktikan dapat melihat status serta keputusan pengajuan sendiri.

**FR-11 Klasifikasi AI.** Setelah pengajuan dibuat, sistem mengirim alasan minimum yang diperlukan ke endpoint AI yang disediakan pengajar melalui layanan aman. Respons yang valid disimpan sebagai kategori, skor/keyakinan bila tersedia, dan waktu klasifikasi. Timeout, respons tidak valid, atau gangguan jaringan tidak membatalkan pengajuan dan ditampilkan sebagai kegagalan klasifikasi yang dapat dicoba ulang sesuai otorisasi yang disepakati.

**FR-12 Pemeriksaan Izin.** Asisten dapat melihat pengajuan izin untuk sesi kelasnya secara real-time, membaca alasan dan hasil AI, lalu menerima atau menolak secara manual. Sistem menyimpan keputusan, UID pemeriksa, waktu server, dan catatan opsional; Praktikan segera melihat hasilnya.

### 6.5 Konsistensi, Validasi, dan Kesalahan

**FR-13 Sinkronisasi Real-Time dan Persistensi.** Daftar sesi, status sesi, rekap presensi, riwayat presensi, pengajuan izin, dan keputusan menggunakan listener Firestore pada data yang diizinkan. Setelah aplikasi dibuka kembali, data ditampilkan kembali dari Firestore atau cache SDK yang konsisten.

**FR-14 Validasi dan Penanganan Kesalahan.** Sistem memvalidasi input sebelum operasi, menerjemahkan kesalahan autentikasi/otorisasi, menangani loading/empty/offline/error state, mencegah aksi ganda saat operasi masih berjalan, dan menyediakan aksi coba lagi jika aman.

**FR-15 Proteksi Data.** Firestore Security Rules memverifikasi autentikasi, peran, kepemilikan data, keanggotaan kelas, bentuk field, dan transisi status penting. Aturan harus menolak operasi ilegal walaupun klien dimodifikasi.

## 7 Kebutuhan Antarmuka dan State Layar

| Layar | Pengguna | Elemen dan state minimum |
|---|---|---|
| Splash atau auth gate | Semua | Pemeriksaan sesi Firebase, indikator loading, fallback saat profil tidak tersedia. |
| Login dan Registrasi | Belum login | Input terkontrol, validasi inline, tombol nonaktif saat submit, link perpindahan layar, pesan error Firebase. |
| Beranda Praktikan | Praktikan | Identitas aktif, jadwal kelas sendiri, status sesi, ringkasan presensi/izin, loading/empty/offline. |
| Beranda Asisten | Asisten | Daftar kelas dikelola, sesi aktif, ringkasan izin pending, aksi tambah. |
| Kelas dan anggota | Asisten | Daftar kelas, form CRUD, daftar anggota, konfirmasi hapus, hasil operasi. |
| Detail sesi | Keduanya | Informasi sesi dan status real-time; tombol berbeda per peran. |
| Form sesi | Asisten | Field kelas, topik, tanggal/waktu, lokasi, validasi rentang waktu, simpan/gagal. |
| Rekap presensi | Asisten | Jumlah hadir dan daftar presensi real-time; loading dan empty state. |
| Kehadiran saya | Praktikan | Riwayat diri sendiri; status tiap sesi dan waktu server yang telah diformat. |
| Ajukan izin dan izin saya | Praktikan | Alasan, status pengajuan, indikator klasifikasi AI, hasil AI atau pesan gagal; keputusan Asisten. |
| Review izin | Asisten | Filter/daftar pending, alasan, hasil AI, tombol Terima/Tolak dengan konfirmasi dan catatan. |

Status tidak boleh disampaikan dengan warna saja. Tombol harus mempunyai label, disabled state, dan pesan alasan ketika aksi tidak tersedia. Akses route dibungkus auth/role guard; komponen non-route tetap berada di luar `src/app/`.

## 8 Struktur Data Firestore

### 8.1 Koleksi dan Kontrak Minimum

| Lokasi | Field minimum | Akses utama |
|---|---|---|
| `users/{uid}` | `uid`, `displayName`, `email`, `role`, `identifier`, `createdAt` | Pengguna membaca profil sendiri; Asisten dapat membaca profil anggota kelas bila diperlukan UI. |
| `classes/{classId}` | `practicumName`, `className`, `lab`, `assistantIds`, `createdBy`, `createdAt`, `updatedAt` | Asisten owner CRUD; anggota membaca. |
| `classes/{classId}/members/{uid}` | `userId`, `role`, `displayName`, `identifier`, `joinedAt` | Asisten kelas kelola; pengguna membaca dokumen dirinya. |
| `sessions/{sessionId}` | `classId`, `title`, `location`, `startsAt`, `endsAt`, `status`, `openedBy`, `openedAt`, `closedBy`, `closedAt`, `createdBy`, `createdAt`, `updatedAt` | Asisten kelas CRUD; anggota kelas membaca. |
| `attendance/{sessionId}_{studentId}` | `sessionId`, `classId`, `studentId`, `studentName`, `studentIdentifier`, `attendedAt` | Praktikan membuat/membaca miliknya; Asisten kelas membaca. |
| `leaveRequests/{sessionId}_{studentId}` | `sessionId`, `classId`, `studentId`, `reason`, `status`, `aiStatus`, `aiCategory`, `aiConfidence`, `aiClassifiedAt`, `reviewedBy`, `reviewedAt`, `reviewNote`, `createdAt`, `updatedAt` | Praktikan membuat/membaca miliknya; Asisten kelas membaca dan memutuskan. |

`createdAt`, `updatedAt`, dan semua waktu aksi menggunakan `serverTimestamp`. Field yang tidak tersedia dari API AI disimpan sebagai `null` atau dihilangkan secara konsisten; error teknis singkat boleh disimpan untuk retry/diagnostik tanpa menyimpan token, stack trace, atau data rahasia.

### 8.2 Indeks dan Query

- `sessions`: query per `classId` dan urutan `startsAt`; Praktikan memperoleh daftar `classId` dari membership yang diizinkan.
- `attendance`: query per `sessionId` untuk rekap dan per `studentId` untuk riwayat; indeks komposit dibuat bila Firestore memintanya.
- `leaveRequests`: query per `classId + status + createdAt` untuk review dan per `studentId + createdAt` untuk riwayat Praktikan; indeks komposit dibuat bila diperlukan.
- Query klien wajib memakai batas kelas/UID yang sesuai Security Rules; tidak ada query yang mencoba membaca seluruh koleksi lintas kelas.

### 8.3 Security Rules Minimum

1. Semua request harus `request.auth != null`, kecuali Firebase Authentication yang ditangani layanan Authentication.
2. Peran dibaca dari `users/{uid}` dan peran di profil tidak dapat ditulis sembarang pengguna setelah pembuatan.
3. Helper rules mengecek apakah UID pengguna adalah `assistantIds` kelas atau memiliki dokumen membership pada kelas terkait.
4. Pembuatan presensi mengharuskan `studentId == request.auth.uid`, ID dokumen cocok dengan `{sessionId}_{uid}`, Praktikan anggota kelas, sesi masih `open`, dan dokumen belum ada. Update/delete presensi ditolak.
5. Pembuatan izin mengharuskan pemohon adalah Praktikan anggota kelas dan isi hanya field yang diizinkan. Praktikan tidak dapat mengubah `status`, `reviewedBy`, atau field keputusan.
6. Update keputusan izin hanya oleh Asisten yang mengelola kelas; perubahan status hanya `pending` ke `approved` atau `rejected`. Asisten tidak boleh mengubah alasan atau identitas pemohon.
7. Operasi sesi dan kelas hanya oleh Asisten yang berwenang serta memvalidasi schema dan transisi status. Penghapusan sesi dengan data turunan diblokir di aplikasi dan/atau aturan pendukung.
8. Security Rules diuji dengan Firebase Emulator atau test suite terhadap skenario allow dan deny sebelum demo.

## 9 Integrasi AI

1. Client tidak menyimpan API key rahasia. Jika API pengajar membutuhkan secret, client memanggil Firebase Cloud Function atau proxy backend yang memverifikasi Firebase ID token, lalu proxy memanggil API pengajar.
2. Payload minimum berisi ID pengajuan dan alasan; UID, email, NIM, atau informasi pribadi lain tidak dikirim kecuali benar-benar diwajibkan API pengajar.
3. Layanan AI mengembalikan kategori alasan dan skor/keyakinan bila ada. UI menampilkan label “hasil klasifikasi AI” sebagai informasi pendukung, bukan keputusan.
4. Gunakan timeout dan pemetaan error. Jika panggilan gagal, simpan `aiStatus: failed`, tampilkan pengajuan tetap berhasil disimpan, dan jangan mengubah `status: pending`.
5. Validasi respons sebelum menyimpan: kategori harus string yang diizinkan/dapat ditampilkan aman, skor numerik dibatasi rentangnya bila disediakan, dan respons mentah tidak ditampilkan langsung.

## 10 Kebutuhan Nonfungsional

- **NFR-01 Mobile first:** kontrol mudah disentuh, Safe Area diperhatikan, teks dan form terbaca pada layar ponsel.
- **NFR-02 Responsif:** gunakan Flexbox dan hindari lebar/tinggi layar tetap; fungsi utama bekerja pada Android, iOS, dan web sesuai dukungan Expo.
- **NFR-03 Kinerja:** listener dibatasi pada data relevan, pagination atau limit dipakai untuk daftar panjang, dan listener dihentikan saat tidak diperlukan.
- **NFR-04 Konsistensi:** satu sumber kebenaran Firestore untuk data bisnis; tidak membuat fixture lokal kedua yang dapat berbeda dari data cloud.
- **NFR-05 Keandalan:** write memakai loading state dan error handling; idempotensi presensi/izin dicapai melalui ID deterministik, aturan, dan transaksi/batch bila operasi lebih dari satu dokumen.
- **NFR-06 Keamanan dan privasi:** Security Rules adalah wajib; kredensial AI tidak dibundel pada aplikasi; data AI diminimalkan; error UI tidak membocorkan data sensitif.
- **NFR-07 Maintainability:** route hanya di `src/app/`, sedangkan Firebase service, repositories, hooks, types, dan komponen berada di luar route. Kontrak TypeScript dan owner file lintas domain disepakati sebelum integrasi.
- **NFR-08 Kompatibilitas:** implementasi mengikuti Expo SDK 58, React Native 0.88, Expo Router, dan versi dependency yang benar-benar terpasang. Library Firebase dipilih dan dipasang dengan cara yang kompatibel terhadap environment Expo.
- **NFR-09 Observability:** error penting dicatat secara aman untuk debugging selama pengembangan tanpa mencatat kata sandi, token, atau alasan izin lengkap ke log publik.

## 11 Batasan Teknis dan Keputusan Implementasi

- Aplikasi memakai TypeScript, React Native, Expo SDK 58, dan Expo Router. Setiap route berada di `src/app/`; `Link`, `router`, dan `useLocalSearchParams` diimpor dari `expo-router` bila diperlukan.
- Firebase Authentication dan Cloud Firestore adalah sumber data produksi Sprint 2. Fixture Sprint 1 hanya boleh dipakai sebagai seed/dev data, bukan fallback runtime yang mengalahkan Firestore.
- Konfigurasi Firebase publik dapat disediakan melalui konfigurasi aplikasi sesuai dokumentasi Firebase; rahasia API AI tidak boleh memakai variabel `EXPO_PUBLIC_` karena nilai tersebut dibundel ke aplikasi.
- Data lintas beberapa dokumen yang harus atomik memakai Firestore transaction atau write batch. Untuk presensi, ID deterministik dan Rules yang menolak overwrite adalah syarat minimum; transaksi dipakai bila validasi status harus disatukan dengan write.
- Security Rules dan indeks Firestore merupakan bagian deliverable, disimpan terpisah dari kode UI, dan dideploy ke project Firebase yang benar.
- Jika fungsi/proxy AI memakai native module tambahan, tim memeriksa kompatibilitas Expo dan kebutuhan development build terlebih dahulu. Tidak membuat atau mengedit folder `android/` maupun `ios/` secara manual pada proyek CNG ini.

## 12 Traceability

| Kode | Requirement | Owner utama pada jobdesc |
|---|---|---|
| FR-01 | Registrasi | AL |
| FR-02 | Login dan logout | AL |
| FR-03 | Profil dan akses berbasis peran | AL |
| FR-04 | CRUD kelas dan anggota | Galang |
| FR-05 | CRUD sesi | Galang |
| FR-06 | Jadwal Praktikan | Galang |
| FR-07 | Buka dan tutup sesi | Galang |
| FR-08 | Presensi Praktikan | Jesica |
| FR-09 | Rekap dan riwayat kehadiran | Jesica |
| FR-10 | Pengajuan izin | Kaka |
| FR-11 | Klasifikasi AI | Kaka |
| FR-12 | Pemeriksaan izin | Kaka |
| FR-13 | Sinkronisasi real-time dan persistensi | Semua programmer per koleksi: AL `users`, Galang `classes`/`members`/`sessions`, Jesica `attendance`, Kaka `leaveRequests` |
| FR-14 | Validasi dan penanganan kesalahan | Owner fitur masing-masing |
| FR-15 | Proteksi data | Semua programmer per fragment Rules koleksi; Abhi mengoordinasikan integration review |

### 12.1 Ketentuan Implementasi Paralel

Pembagian programmer memakai vertical slice agar tidak ada dependency implementasi fitur harian antar programmer. Sebelum coding, Abhi memfasilitasi kontrak minimum untuk `AuthUser`, `SessionSummary`, `AttendanceRecord`, dan `LeaveRequest`, termasuk nilai peran, status, ID deterministik, serta format error. Setiap owner dapat mengembangkan dan menguji modulnya melalui adapter/mock yang mengikuti kontrak tersebut tanpa menunggu modul programmer lain selesai.

Feature module tidak boleh membaca state internal feature module lain. Integrasi dilakukan melalui kontrak bersama dan adapter Firebase/Firestore pada koleksi yang dimiliki masing-masing owner. Dependency yang tersisa hanya kontrak awal serta integrasi aplikasi akhir, yang dikoordinasikan Abhi dan tidak boleh memblokir pekerjaan harian.

## 13 Kriteria Penerimaan Sprint

1. Praktikan dan Asisten dapat membuat akun, login, melihat identitas/peran benar, dan logout; pengguna belum login tidak dapat membuka layar terlindungi.
2. Asisten dapat membuat kelas, mengelola anggota, dan membuat sesi; Praktikan hanya melihat jadwal kelas yang diikutinya.
3. Asisten membuka sesi dari perangkat/akun A, Praktikan anggota melihat status `open` dari akun B tanpa reload, membuat satu presensi, dan rekap Asisten langsung bertambah.
4. Presensi kedua pada kombinasi Praktikan+sesi yang sama ditolak tanpa menimpa waktu presensi pertama. Praktikan lain atau nonanggota tidak dapat menulis presensi.
5. Asisten menutup sesi dan Praktikan tidak dapat melakukan presensi baru setelah perubahan tersinkronkan.
6. Praktikan dapat mengajukan izin dengan alasan valid. Pengajuan tetap tersimpan bila AI timeout/gagal dan status izin tetap `pending`.
7. Hasil klasifikasi AI muncul sebagai informasi pendukung bila tersedia, tetapi tidak dapat mengubah keputusan izin secara otomatis.
8. Asisten dapat melihat pengajuan kelasnya, menerima atau menolak, dan Praktikan melihat keputusan real-time.
9. Data yang ditulis tetap ada setelah aplikasi direstart dan dapat dibaca oleh akun yang tepat. Loading, empty, offline/error, dan aksi ulang tersedia pada layar relevan.
10. Pengujian Security Rules membuktikan operasi lintas peran, lintas kelas, presensi duplikat, dan perubahan keputusan oleh Praktikan ditolak.
11. Lint dan typecheck proyek dijalankan serta hasilnya dicatat sebelum Sprint dinyatakan selesai.

## 14 Skenario Demo

### Demo A Presensi lintas pengguna

1. Login sebagai Asisten pemilik kelas dan buka sesi terjadwal.
2. Login sebagai Praktikan yang menjadi anggota kelas pada perangkat atau akun lain.
3. Tunjukkan status sesi berubah menjadi terbuka, lalu Praktikan melakukan presensi.
4. Tunjukkan rekap Asisten berubah real-time, kemudian Asisten menutup sesi.
5. Tunjukkan Praktikan tidak lagi dapat menekan presensi dan data tetap ada setelah aplikasi dibuka kembali.

### Demo B Izin berbantuan AI

1. Login sebagai Praktikan dan ajukan izin pada sesi kelasnya.
2. Tunjukkan status klasifikasi AI berhasil atau gagal dengan pengajuan tetap `pending`.
3. Login sebagai Asisten kelas tersebut, buka daftar izin, dan gunakan hasil AI hanya sebagai konteks.
4. Terima atau tolak pengajuan secara manual.
5. Kembali ke akun Praktikan dan tunjukkan status keputusan berubah tanpa reload.

## 15 Referensi Teknis

| Topik | Referensi |
|---|---|
| Expo SDK 58 | https://docs.expo.dev/versions/v58.0.0/ |
| Expo Router | https://docs.expo.dev/router/introduction/ |
| Firebase Authentication | https://firebase.google.com/docs/auth |
| Cloud Firestore | https://firebase.google.com/docs/firestore |
| Firestore real-time listeners | https://firebase.google.com/docs/firestore/query-data/listen |
| Firestore Security Rules | https://firebase.google.com/docs/firestore/security/get-started |
| Firebase Emulator Suite Security Rules | https://firebase.google.com/docs/rules/unit-tests |
