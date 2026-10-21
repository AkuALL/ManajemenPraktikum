# SRS — Sistem Manajemen Praktikum (Sprint 1)

## Dasar Penyusunan

SRS ini merumuskan user story Sprint 1 untuk aplikasi demonstrasi React Native/Expo. Data identitas, jadwal, sesi, dan presensi bersifat dummy serta dikelola dalam state selama aplikasi berjalan. Database dan sinkronisasi backend tidak termasuk.

## 1. Pendahuluan dan Ruang Lingkup

### 1.1 Tujuan

Menjadi acuan kebutuhan, acceptance criteria, dan batas implementasi Sprint 1.

### 1.2 Gambaran Sistem

Aplikasi mendemonstrasikan dua peran: Asisten mengelola sesi serta melihat rekap demo; Praktikan melihat jadwal, melakukan presensi pada sesi terbuka, dan melihat catatan kehadirannya. Peran dan identitas dipilih melalui UI.

### 1.3 In Scope

- Pemilihan peran/identitas dummy.
- Daftar jadwal dan detail sesi: praktikum, kelas/lab, waktu, status.
- Asisten membuka/menutup sesi dengan perubahan status terlihat di antarmuka terkait.
- Praktikan melakukan presensi pada sesi terbuka, mendapat waktu dan feedback, serta tidak dapat presensi dua kali pada sesi yang sama.
- Asisten melihat daftar presensi demo beserta waktunya; Praktikan melihat riwayat miliknya.
- Form/pilihan, modal atau bottom sheet untuk konfirmasi/informasi pendukung.
- Navigasi layar, Flexbox, state respons terhadap aksi, empty state, dan status sesi/presensi.

### 1.4 Out of Scope

Database, API, autentikasi nyata, sinkronisasi perangkat/peran, persistensi setelah aplikasi ditutup, notifikasi, QR, lokasi, ekspor, dan administrasi data. Rekap Asisten tidak wajib sama dengan riwayat Praktikan.

## 2. Terminologi

| Istilah | Arti |
|---|---|
| Sesi | Pertemuan praktikum pada jadwal tertentu. |
| Status sesi | Belum dibuka, Berlangsung, atau Selesai. |
| Presensi | Catatan identitas Praktikan dan waktu hadir untuk satu sesi. |
| Identitas aktif | Identitas dummy terpilih yang sedang menggunakan aplikasi. |
| State lokal | Perubahan sementara selama aplikasi berjalan, tanpa server/database. |

## 3. Aktor dan Hak Akses

| Fitur | Asisten | Praktikan |
|---|:---:|:---:|
| Memilih identitas demo | Ya | Ya |
| Melihat jadwal/detail | Ya | Ya |
| Membuka/menutup sesi | Ya | Tidak |
| Mencatat presensi | Tidak | Ya |
| Melihat rekap sesi | Ya | Tidak |
| Melihat riwayat sendiri | Tidak | Ya |

Hak akses dikondisikan pada peran aktif dan status sesi. Ini aturan UI demo, bukan mekanisme keamanan produksi.

## 4. Aturan Bisnis

1. Status valid: **Belum dibuka → Berlangsung → Selesai**. Buka hanya dari Belum dibuka; tutup hanya dari Berlangsung.
2. Praktikan hanya dapat presensi saat sesi Berlangsung.
3. Satu identitas Praktikan hanya memiliki satu catatan pada satu sesi. Percobaan ulang mempertahankan waktu catatan pertama.
4. Waktu dicatat oleh perangkat saat aksi diterima; format waktu konsisten dan tidak diklaim sebagai waktu server.
5. Perubahan status sesi harus terlihat pada daftar/detail yang menggunakan state sesi tersebut.
6. Rekap Asisten dan riwayat Praktikan boleh memakai dataset terpisah; tidak ada sinkronisasi yang dijanjikan.
7. State bersifat sementara dan dapat hilang saat aplikasi ditutup/reload.
8. Status disampaikan dengan teks/ikon, bukan warna saja. Aksi konfirmasi yang dibatalkan tidak mengubah state.

## 5. Alur Utama

### 5.1 Pemilihan Identitas

Pilih peran → pilih identitas yang sesuai → masuk ke beranda peran. Pengguna dapat mengganti pilihan melalui kontrol yang tersedia.

### 5.2 Asisten

Lihat jadwal → pilih sesi → tinjau detail/status → konfirmasi **Buka sesi** → status Berlangsung terlihat pada layar terkait → lihat rekap (atau empty state) → konfirmasi **Tutup sesi** → status Selesai terlihat.

### 5.3 Praktikan

Lihat jadwal → buka detail sesi. Sebelum sesi dibuka, aksi presensi tidak tersedia dan alasannya dijelaskan. Saat Berlangsung, Praktikan presensi → aplikasi mencatat waktu dan memberi feedback → catatan muncul pada riwayat lokal. Percobaan kedua ditolak. Setelah sesi Selesai, presensi baru tidak diterima.

## 6. Functional Requirements

### 6.1 Umum

**FR-01 — Pilih Peran dan Identitas.** Aplikasi menyediakan pilihan Asisten/Praktikan dan identitas dummy sesuai peran. Identitas aktif menentukan konteks halaman dan aksi.

**FR-02 — Navigasi.** Aplikasi menyediakan navigasi antarlayar menggunakan Expo Router. Tata letak disusun dengan Flexbox dan dioptimalkan untuk layar mobile.

### 6.2 Jadwal dan Sesi

**FR-03 — Jadwal.** Aplikasi menampilkan nama praktikum, kelas/lab, waktu, dan status sesi. Daftar kosong memiliki penjelasan yang informatif.

**FR-04 — Detail Sesi.** Pengguna dapat melihat detail sesi dan status terkini. Perubahan selama aplikasi berjalan tercermin pada tampilan terkait.

**FR-05 — Buka Sesi.** Asisten dapat membuka sesi berstatus Belum dibuka setelah konfirmasi. Status menjadi Berlangsung. Peran Praktikan dan status lain tidak dapat menjalankan aksi ini.

**FR-06 — Tutup Sesi.** Asisten dapat menutup sesi Berlangsung setelah konfirmasi. Status menjadi Selesai dan terlihat pada daftar/detail.

### 6.3 Presensi

**FR-07 — Presensi Praktikan.** Praktikan dapat mencatat presensi saat sesi Berlangsung. Aplikasi mencatat waktu lokal, memberi feedback, dan mencegah catatan kedua untuk pasangan identitas+sesi yang sama.

**FR-08 — Rekap Asisten.** Asisten dapat melihat daftar Praktikan demo yang hadir pada sesi dan waktu hadir masing-masing. Daftar kosong memiliki empty state.

**FR-09 — Riwayat Praktikan.** Praktikan dapat melihat catatan kehadiran identitas aktif beserta sesi/waktunya. Riwayat kosong memiliki empty state.

## 7. Validasi dan Kasus Tepi

- Sesi Belum dibuka atau Selesai: presensi ditolak dengan alasan yang jelas.
- Duplikasi: catatan pertama dipertahankan, tidak dibuat catatan baru.
- Konfirmasi buka/tutup dibatalkan: status tetap.
- Tidak ada jadwal/rekap/riwayat: tampilkan empty state, bukan layar kosong.
- Tidak ada identitas aktif: minta pengguna memilih identitas sebelum masuk ke alur peran.
- Navigasi antarhalaman tidak boleh menampilkan status usang selama state sumber masih hidup.

## 8. UX Needs dan Struktur Halaman

### 8.1 UX Needs

Aksi utama jelas dan kontekstual; form/pilihan digunakan untuk input; modal/bottom sheet untuk konfirmasi; hasil aksi, validasi, dan status ditampilkan dalam bahasa Indonesia yang ringkas. Sediakan empty, berhasil, dan gagal state yang relevan.

### 8.2 Susunan Halaman yang Disarankan

1. Pemilihan peran/identitas.
2. Beranda/jadwal.
3. Detail sesi.
4. Rekap sesi (Asisten).
5. Kehadiran saya (Praktikan).

Susunan dapat disederhanakan jika semua FR tetap tercapai.

## 9. Non-Functional Requirements

Kode kebutuhan non-fungsional yang dipakai lintas dokumen adalah `NFR-XX` di daftar ini.

- **NFR-01 Mobile-first:** kontrol mudah disentuh dan konten terbaca pada layar mobile.
- **NFR-02 Responsive:** Flexbox dan layout tidak terikat satu ukuran layar.
- **NFR-03 Usability:** label, status, validasi, dan feedback konsisten serta mudah dipahami.
- **NFR-04 Performance:** state lokal responsif; hindari proses berat saat render daftar.
- **NFR-05 Compatibility:** gunakan API yang cocok dengan versi Expo/React Native di proyek dan hindari dependensi yang tidak diperlukan.
- **NFR-06 Maintainability:** batas domain dan kontrak data jelas; file bersama memiliki satu owner.
- **NFR-07 Data boundary:** hanya dummy; data sementara dan tidak disinkronkan.

## 10. Batasan Teknis

Implementasi menggunakan React Native dengan TypeScript dan Expo SDK 57 yang tercatat pada dependency proyek, serta Expo Router untuk navigasi. EAS digunakan untuk membuat build aplikasi Android/iOS di cloud sesuai konfigurasi proyek. Data identitas, jadwal, sesi, dan presensi tetap dummy/lokal dalam state runtime; penggunaan EAS tidak berarti data disimpan atau disinkronkan di cloud.

Prinsip implementasi UI:

- Gunakan component, props, dan state React untuk membentuk UI dan merespons tindakan pengguna. Input teks yang digunakan harus dikendalikan oleh state agar nilai dan validasinya terlihat konsisten.
- Susun layar dengan Flexbox untuk berbagai ukuran layar; ingat default React Native berbeda dari CSS web, termasuk `flexDirection: 'column'`.
- Definisikan style React Native menggunakan object JavaScript/`StyleSheet.create`, bukan stylesheet CSS web.
- Gunakan komponen `Modal` untuk konfirmasi atau informasi pendukung yang perlu tampil di atas layar. Bottom sheet dapat dibuat dengan pola yang sesuai dependency proyek, tanpa menambah library native bila tidak diperlukan.
- Gunakan Expo Router untuk navigasi file-based dan screen di `src/app/`; file komponen non-route tetap di luar folder route.

### 10.1 Referensi Teknis

| Topik | Penggunaan pada Sprint 1 | Referensi |
|---|---|---|
| React fundamentals (TypeScript) | Component, props, dan pola UI React Native | [React Native: Intro to React](https://reactnative.dev/docs/intro-react?language=typescript&guide=android) |
| Flexbox | Layout responsif daftar, detail, dan form | [React Native: Flexbox](https://reactnative.dev/docs/flexbox?language=javascript) |
| State dan input | Kelola input/state interaksi; input berubah lewat handler state | [React Native: Handling Text Input](https://reactnative.dev/docs/handling-text-input) |
| Modal | Konfirmasi buka/tutup sesi dan informasi pendukung | [React Native: Modal](https://reactnative.dev/docs/modal) |
| StyleSheet | Aturan style komponen dengan JavaScript | [React Native: Style](https://reactnative.dev/docs/style) |
| Navigation | Stack/tab dan routing berbasis file dengan Expo Router | [Expo: Add navigation](https://docs.expo.dev/tutorial/add-navigation/) |
| Cloud build | Build binary Android/iOS menggunakan EAS Build | [Expo: EAS Build](https://docs.expo.dev/build/introduction/) |

Versi proyek yang diperiksa: `expo ~57.0.30`, `expo-router ~57.0.28`, dan `react-native 0.86.3`. Bila dokumentasi atau contoh berubah, cocokkan instruksi dengan versi yang terpasang sebelum mengadopsi API.

## 11. Traceability

Kode kebutuhan fungsional sistem adalah `FR-XX` dan berdiri sendiri sebagai penanda requirement umum pada SRS. Kode ini digunakan konsisten pada jobdesc. Kode task programmer (misalnya `AB-01` atau `JE-03`) adalah penomoran pekerjaan internal, bukan kode requirement sistem.

| Kode FR | Kebutuhan |
|---|---|
| FR-01 | Pemilihan peran dan identitas |
| FR-02 | Navigasi dan layout |
| FR-03 | Daftar jadwal |
| FR-04 | Detail sesi |
| FR-05 | Asisten membuka sesi |
| FR-06 | Asisten menutup sesi |
| FR-07 | Presensi, waktu, feedback, anti-duplikasi |
| FR-08 | Rekap demo Asisten beserta waktu |
| FR-09 | Riwayat kehadiran Praktikan |

| Kebutuhan user story | Kode FR umum atau bagian terkait |
|---|---|
| Form/pilihan/modal/bottom sheet | FR-01, FR-05–FR-07, bagian 8 |
| Data lokal, state, navigasi, Flexbox | FR-02, NFR-01, NFR-02, NFR-07 |
| Empty state/sesi tertutup/presensi tercatat | FR-03, FR-07–FR-09, bagian 7 |
| Tidak wajib sinkron antarperan | Bagian 1.4 dan 4 |

## 12. Kriteria Penerimaan Sprint

- Asisten dan Praktikan dapat dipilih bersama identitas dummy yang sesuai.
- Buka/tutup sesi meminta konfirmasi dan perubahan status tampak pada halaman terkait.
- Praktikan hanya dapat presensi pada sesi Berlangsung; waktu dan feedback ditampilkan; presensi kedua ditolak.
- Asisten melihat rekap demo dengan waktu atau empty state; Praktikan melihat riwayat sendiri atau empty state.
- Setelah sesi ditutup, status Selesai ditampilkan dan presensi baru ditolak.
- Seluruh alur menggunakan navigasi dan state responsif pada UI mobile; kesamaan dataset rekap dan riwayat bukan syarat.
