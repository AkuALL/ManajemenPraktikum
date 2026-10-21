# Sistem Manajemen Praktikum — Jobdesc Programmer Sprint 1

## 1. Prinsip Pembagian

- AL menjadi PM: menjaga scope, menyepakati kontrak, integrasi, acceptance, dan koordinasi. Abhi, Galang, Jesica, dan Kaka masing-masing memiliki satu domain produk.
- Semua programmer bertanggung jawab atas implementasi dan pemeriksaan fitur domainnya; tidak ada domain yang hanya bertugas QA.
- Programmer boleh membuat screen route sendiri di `src/app/`; komponen, hooks, data, dan utilitas non-route ditempatkan di luar `src/app/` sesuai Expo Router.
- File bersama memiliki satu owner. Programmer tidak mengedit domain lain tanpa koordinasi dengan owner dan AL.
- Backend/database/sinkronisasi bukan bagian sprint.
- Implementasi mengikuti referensi teknis di bagian 11: React component/props/state, Flexbox, state-driven input, React Native `Modal` dan `StyleSheet`, Expo Router, serta EAS Build.
- EAS digunakan untuk build aplikasi di cloud; bukan penyimpanan runtime untuk jadwal atau presensi. Dataset tetap lokal dan volatile.

## 2. Ownership

| Anggota | Peran | Ownership |
|---|---|---|
| AL | PM | Scope, koordinasi kontrak, review, acceptance/demo; tidak mengimplementasikan kode |
| Abhi | Programmer | Jadwal, detail sesi, fixture sesi kanonis, rekap presensi demo |
| Galang | Programmer | Identitas dummy, pemilihan peran dan identitas |
| Jesica | Programmer | Presensi Praktikan, anti-duplikasi, riwayat pribadi |
| Kaka | Programmer | Aksi buka/tutup sesi Asisten |

## 3. Kontrak Data Minimum

```ts
type UserRole = 'assistant' | 'student';
type SessionStatus = 'upcoming' | 'open' | 'closed';

type LabSession = {
  id: string;
  practicumName: string;
  location: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
};

type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  attendedAt: string;
};
```

Kontrak ini hanya tipe data demo, bukan skema database. Disepakati sebelum integrasi; perubahan field dikoordinasikan agar tidak memaksa programmer lain mengubah internal domainnya.

### 3.1 Kepemilikan State

- Abhi memiliki fixture jadwal/sesi kanonis. Kaka meneruskan buka/tutup melalui callback yang disepakati; jangan membuat salinan jadwal/status kedua.
- Galang memiliki identitas aktif dan mengembalikan role, userId, displayName.
- Jesica memiliki riwayat presensi Praktikan; kunci unik lokal `studentId + sessionId`.
- Abhi memiliki fixture rekap presensi demo per sesi. Dataset ini dapat terpisah dari riwayat Praktikan dan dikelola sebagai bagian data sesi.
- Sinkronisasi presensi kedua peran tidak dijanjikan dan bukan acceptance criterion.
- Jika tim ingin satu demo memakai catatan presensi yang sama lintas peran, sepakati store bersama sebagai keputusan tambahan sebelum implementasi; jangan mengasumsikannya.

## 4. Detail Jobdesc

### 4.1 AL — Project Manager dan Integrasi

**Task**

- **AL-01 — Scope & Acceptance:** menjaga daftar FR dan acceptance criteria sesuai SRS.
- **AL-02 — Contract Coordination:** memfasilitasi kesepakatan tipe data, props/callback, route ownership, dan keputusan integrasi bersama programmer.
- **AL-03 — Navigation Coordination:** memastikan programmer owner navigasi memahami route dan alur peran sesuai SRS; tidak mengubah atau menulis file kode.
- **AL-04 — Integration Review:** memeriksa role, status, empty state, navigasi, konsistensi UI, dan melaporkan defect kepada owner domain.
- **AL-05 — Demo Coordination:** menyiapkan skenario penerimaan dan mencatat blocker/hasil aktual.

**Dependency:** AL-01/02 mulai lebih dahulu. AL-03/04/05 berjalan melalui koordinasi dan review, tanpa implementasi kode oleh PM.

**Batas scope:** tidak mengambil alih state bisnis jadwal, identitas, presensi, atau rekap.

### 4.2 Abhi — Jadwal dan Detail Sesi

**Task**

- **AB-01 — Session Fixtures:** seed sesi dengan ID stabil, nama, lokasi, waktu, dan status.
- **AB-02 — Schedule List:** daftar jadwal, urutan konsisten, ringkasan status, dan empty state.
- **AB-03 — Session Detail:** tampilkan semua informasi sesi dan status terkini dari sumber state yang dipakai.
- **AB-04 — Selection Boundary:** ekspor callback pemilihan sesi/komponen yang tidak mengunci navigasi domain lain.
- **AB-05 — Attendance Fixture:** sediakan data rekap presensi dummy per sesi berisi identitas/nama dan waktu kehadiran; data ini tidak perlu terhubung dengan state presensi Praktikan.
- **AB-06 — Session Summary:** tampilkan rekap per sesi dari fixture, termasuk empty state jika belum ada catatan.
- **AB-07 — Domain QA:** cek fixture jadwal/rekap lengkap dan kosong, tampilan status, layout mobile, serta pembaruan status dari callback.

**Dependency:** AB-01 menjadi dasar AB-02/03/05/06. Aksi status dimiliki Kaka dan disalurkan melalui callback.

**Batas scope:** tidak memiliki picker identitas, pencatatan presensi Praktikan, atau tombol buka/tutup.

### 4.3 Galang — Identitas Demo dan Navigasi

**Task**

- **GA-01 — Identity Fixtures:** data dummy Asisten/Praktikan dengan ID stabil dan display name.
- **GA-02 — Role Picker:** pilihan peran dan state belum dipilih.
- **GA-03 — Identity Picker:** pilihan identitas sesuai peran dan callback hasil `role`, `userId`, `displayName`.
- **GA-04 — Switch Identity:** cara mengganti peran/identitas tanpa mengubah data internal domain lain.
- **GA-05 — Expo Router Navigation:** memiliki `src/app/_layout.tsx` dan navigasi berbasis peran; hubungkan route screen domain serta alur perpindahan dari/ke pemilihan identitas.
- **GA-06 — Domain QA:** cek daftar kosong, pilihan/pergantian, label aktif, navigasi peran, dan layout mobile.

**Dependency:** GA-02–04 bergantung pada fixture GA-01; GA-05 memakai route exports/signature yang disediakan owner screen. Programmer domain bertanggung jawab menyediakan screen route-nya sesuai kontrak navigasi.

**Batas scope:** tidak membuat autentikasi nyata, RBAC backend, jadwal, sesi, atau presensi.

### 4.4 Jesica — Presensi dan Riwayat Praktikan

**Task**

- **JE-01 — Attendance State:** state/helper catatan Praktikan lokal dengan kunci unik identitas+sesi.
- **JE-02 — Eligibility:** presensi aktif hanya untuk sesi `open`; jelaskan status `upcoming`/`closed`.
- **JE-03 — Submit & Feedback:** catat waktu perangkat saat berhasil; tunjukkan feedback; percobaan ulang tidak mengganti catatan pertama.
- **JE-04 — My Attendance:** daftar riwayat identitas aktif dengan nama sesi, waktu, dan empty state.
- **JE-05 — Domain QA:** cek berhasil, duplikasi, status tidak valid, pergantian identitas, empty state, dan layout mobile.

**Dependency:** JE-01 dapat memakai fixture kontrak; JE-02/03 memerlukan sessionId/status dan identitas melalui props. Tidak bergantung pada fixture rekap Abhi.

**Batas scope:** tidak mengubah jadwal/status atau membuat rekap Asisten; tidak mengklaim sinkronisasi.

### 4.5 Kaka — Aksi Sesi Asisten

**Task**

- **KA-01 — Session Actions:** aksi buka untuk `upcoming`, tutup untuk `open`, dengan konfirmasi modal/bottom sheet.
- **KA-02 — Status Callback:** kirim transisi ke state sesi kanonis; perubahan harus terlihat di daftar/detail terkait.
- **KA-03 — Action State & Domain QA:** tampilkan kontrol yang sesuai status, dan cek konfirmasi batal, transisi buka/tutup, peran/status, serta layout mobile.

**Dependency:** KA-01 dapat dibuat memakai fixture kontrak sementara. KA-02 memerlukan callback status dari boundary Abhi/AL.

**Batas scope:** tidak membuat ulang jadwal, menampilkan rekap, mencatat presensi Praktikan, atau mengubah riwayat Praktikan.

## 5. Pemetaan FR Sistem ke Programmer

`FR-XX` adalah kode functional requirement umum milik sistem dan merujuk langsung ke FR di SRS. `AL-XX`, `AB-XX`, `GA-XX`, `JE-XX`, dan `KA-XX` adalah kode task internal milik masing-masing anggota; kode tersebut tidak menggantikan atau menjadi awalan kode FR. Kolom task menunjukkan pekerjaan internal yang berkontribusi pada FR terkait.

| Kode FR sistem | Ringkasan requirement | Programmer/owner | Kode task internal terkait |
|---|---|---|---|
| FR-01 | Pemilihan peran dan identitas demo | Galang | GA-01–GA-04 |
| FR-02 | Navigasi dan layout mobile | Galang (Expo Router dan alur peran); setiap programmer (layout screen domain) | GA-05–GA-06; seluruh owner menjaga layout screen masing-masing |
| FR-03 | Daftar jadwal | Abhi | AB-01–AB-02, AB-07 |
| FR-04 | Detail sesi/status terkini | Abhi; integrasi status bersama Kaka dan AL | AB-03–AB-04, AB-07, KA-02, AL-04 |
| FR-05 | Asisten membuka sesi | Kaka; perubahan state kanonis dikoordinasikan dengan Abhi/AL | KA-01–KA-03, AB-07, AL-04 |
| FR-06 | Asisten menutup sesi | Kaka; perubahan state kanonis dikoordinasikan dengan Abhi/AL | KA-01–KA-03, AB-07, AL-04 |
| FR-07 | Presensi Praktikan, waktu, feedback, anti-duplikasi | Jesica | JE-01–JE-03, JE-05 |
| FR-08 | Rekap Asisten dan waktu presensi | Abhi | AB-05–AB-07 |
| FR-09 | Riwayat kehadiran Praktikan | Jesica | JE-01, JE-04–JE-05 |

| Kode NFR sistem | Requirement lintas fitur | Penanggung jawab |
|---|---|---|
| NFR-01–04 | Mobile-first, responsive, usability, performance | Semua programmer pada domain masing-masing; AL meninjau integrasi |
| NFR-05 | Kompatibilitas Expo/React Native dan dependensi | AL mengoordinasikan konfigurasi; semua programmer menjaga kompatibilitas kode |
| NFR-06 | Maintainability dan batas domain | Semua programmer; AL menjaga kontrak/file bersama |
| NFR-07 | Data dummy, sementara, tanpa sinkronisasi | Semua programmer; AL memeriksa batas scope |

FR-01 sampai FR-09 adalah kode requirement sistem yang umum dan mandiri. Kode AL/AB/GA/JE/KA hanya melacak task milik individu. Kebutuhan UX/empty/error/success pada SRS berlaku bagi owner FR terkait, bukan hanya AL.

## 6. Urutan Implementasi dan Dependency Rendah

### Tahap 1 — Kontrak Bersama

AL memfasilitasi kesepakatan tipe data minimum, props/callback, dan ownership file bersama. Galang menetapkan struktur route sesuai kesepakatan; setiap programmer dapat memakai fixture lokal yang sesuai kontrak.

### Tahap 2 — Implementasi Paralel

- Abhi: fixture jadwal, list/detail.
- Galang: identitas dan picker.
- Jesica: state presensi, validasi status, riwayat.
- Kaka: aksi buka/tutup sesi dan konfirmasi.
- Abhi: fixture jadwal serta rekap presensi demo.
- Galang: Expo Router shell dan navigasi role-aware.
- AL: acceptance checklist dan koordinasi kontrak.

### Tahap 3 — Integrasi Terbatas

- Galang menghubungkan picker ke shell dan menautkan screen sesuai route contract.
- AL meninjau hasil integrasi dan memastikan alur acceptance terpenuhi tanpa mengubah kode.
- Status sesi kanonis Abhi disambungkan dengan aksi Kaka serta tampilan jadwal/detail.
- Input identitas dan sesi disalurkan ke alur Jesica.
- Dataset presensi peran tetap dapat terpisah; jangan menambah sinkronisasi tanpa keputusan tim.

### Tahap 4 — Penerimaan

Setiap owner memeriksa acceptance criteria domain; AL menelusuri alur, mencatat defect beserta hasil aktual, dan mengembalikannya ke owner. Jalankan lint dan TypeScript check proyek.

Jika kontrak belum siap, sebutkan field/signature yang belum ada, beri tahu owner dan AL, lalu lanjutkan pekerjaan independen menggunakan fixture typed. Jangan membuat state kanonis duplikat.

## 7. Ownership File dan No-Overlap

Path berikut usulan sesuai aturan proyek; cocokkan dengan struktur nyata sebelum membuat file.

| File/area | Owner |
|---|---|
| `src/app/_layout.tsx`, route shell/tab/stack | Galang |
| Route daftar/detail/jadwal dan modul `schedule` | Abhi |
| Komponen/data picker identitas di luar route shell | Galang |
| Route/komponen Praktikan | Jesica |
| Route/komponen Asisten | Kaka |
| `src/types/` kontrak lintas-domain | Galang mengelola berkas; perubahan field disepakati bersama dan difasilitasi AL |
| Tema global | Galang mengelola berkas tema; perubahan visual domain dikoordinasikan |
| `package.json` | Programmer yang memerlukan dependency mengajukan perubahan; AL mengoordinasikan, owner terkait menerapkan |
| `eas.json` dan konfigurasi EAS | Programmer teknis yang ditunjuk tim; AL mengoordinasikan build profile dan jadwal build |

Semua screen Expo Router tetap di `src/app/`. Komponen, hooks, fixtures, dan utilitas berada di luar `src/app/`. Programmer dapat membuat route domainnya sendiri tetapi tidak mengubah root layout bersama tanpa koordinasi.

## 8. Dependency Matrix

| Consumer | Kontrak yang dibutuhkan | Owner | Jika belum tersedia |
|---|---|---|---|
| Jesica | sessionId/status dan identitas aktif | Abhi/Galang | UI/state dikerjakan dengan fixture kontrak; integrasi ditunda |
| Kaka | sesi kanonis dan callback transisi | Abhi/AL | UI/konfirmasi/recoverable callback dikerjakan mandiri |
| Abhi | tidak ada input domain eksternal | Abhi | tidak terblokir |
| Galang | tidak ada input domain eksternal | Galang | tidak terblokir |
| Expo Router shell | screen exports dan picker result | Galang | siapkan route contract; tautkan setelah signature tersedia |
| Rekap sesi | fixture kehadiran demo | Abhi | tidak menunggu Jesica; dataset rekap dapat terpisah |

## 9. Definition of Done

- FR/acceptance criteria domain terpenuhi dan state kosong/hasil/error relevan ditampilkan.
- Aksi sesuai peran/status; kontrak data konsisten.
- Layout diuji pada ukuran mobile yang didukung dan tidak memakai ukuran layar tunggal.
- Tidak ada backend/database/sinkronisasi yang melampaui scope.
- Perubahan tidak mengambil ownership programmer lain.
- Lint dan typecheck dijalankan sebelum Sprint dinyatakan selesai; kegagalan dilaporkan bersama hasil aktual.
- Implementasi sesuai versi Expo/React Native terpasang.

## 10. Ringkasan

```text
AL      → PM, koordinasi kontrak, review dan acceptance (tanpa coding)
Abhi    → jadwal, detail sesi dan rekap demo
Galang  → pemilihan peran/identitas dan Expo Router navigation
Jesica  → presensi Praktikan dan riwayat
Kaka    → aksi buka/tutup sesi Asisten
```

Keempat programmer dapat mengerjakan domain inti secara paralel setelah kontrak tipe disepakati. Dependency silang hanya pada input/callback yang jelas. Sinkronisasi rekap dan riwayat tidak termasuk kriteria sprint.

## 11. Referensi Implementasi untuk Semua Programmer

Tabel ini berlaku untuk semua domain. Owner tetap bertanggung jawab menerapkan prinsip tersebut pada screen dan komponen miliknya; AL mengoordinasikan konfigurasi dan meninjau hasil integrasi.

| Prinsip/teknologi | Penerapan kerja | Referensi |
|---|---|---|
| React fundamentals dengan TypeScript | Komponen UI, props, event handler, dan state seperlunya | [React Native: Intro to React](https://reactnative.dev/docs/intro-react?language=typescript&guide=android) |
| Flexbox | Layout mobile yang menyesuaikan ruang tersedia; gunakan perilaku default React Native | [React Native: Flexbox](https://reactnative.dev/docs/flexbox?language=javascript) |
| State-driven input | Sinkronkan nilai input, perubahan, dan validasi melalui state/handler | [React Native: Handling Text Input](https://reactnative.dev/docs/handling-text-input) |
| Modal | Konfirmasi yang butuh respons pengguna dan informasi pendukung | [React Native: Modal](https://reactnative.dev/docs/modal) |
| StyleSheet | Definisi style pada JavaScript dengan konvensi React Native | [React Native: Style](https://reactnative.dev/docs/style) |
| Navigation | Navigasi stack/tab dan aturan file route Expo Router | [Expo: Add navigation](https://docs.expo.dev/tutorial/add-navigation/) |
| Expo EAS | Build cloud untuk binary Android/iOS; AL mengoordinasikan jadwal, programmer teknis mengelola konfigurasi | [Expo: EAS Build](https://docs.expo.dev/build/introduction/), [EAS JSON](https://docs.expo.dev/build/eas-json/) |

Versi dependency proyek yang menjadi acuan saat dokumen ini diperbarui: Expo SDK `~57.0.30`, Expo Router `~57.0.28`, React Native `0.86.3`. Cek versi proyek dan dokumentasi yang cocok sebelum menggunakan API yang berubah antarversi.
