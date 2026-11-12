# Sistem Manajemen Praktikum Jobdesc Programmer Sprint 2

## 1 Tujuan Pembagian

Sprint 2 menggunakan Abhi sebagai Project Manager dan empat programmer: AL, Galang, Jesica, serta Kaka. Pembagian ini memisahkan fondasi data, autentikasi, pengalaman Praktikan, dan pengalaman operasional Asisten agar pekerjaan dapat berjalan paralel tanpa membuat sumber data Firestore ganda.

| Anggota | Peran | Domain utama |
|---|---|---|
| Abhi | Project Manager | Scope, kontrak, integrasi, acceptance, demo, dan pengendalian risiko; tidak mengambil ownership implementasi fitur. |
| AL | Programmer Data dan Praktikum | Firebase project integration, Firestore repository, Security Rules, kelas, anggota, sesi, dan data jadwal. |
| Galang | Programmer Auth dan Navigasi | Firebase Authentication, profil pengguna, role guard, session aplikasi, dan Expo Router shell. |
| Jesica | Programmer Praktikan dan AI | Presensi Praktikan, riwayat pribadi, pengajuan izin, status klasifikasi AI, dan error state domain Praktikan. |
| Kaka | Programmer Operasional Asisten | Buka/tutup sesi, rekap presensi, daftar/review izin, dan keputusan manual Asisten. |

Abhi tidak menulis fitur kode agar dapat menjaga acceptance dan menyelesaikan konflik dependency. Keempat programmer tetap bertanggung jawab atas unit/domain test, validasi, dan perbaikan bug pada domain masing-masing.

## 2 Prinsip Kerja dan Kontrak Bersama

1. Firebase Authentication dan Firestore adalah satu-satunya sumber identitas dan data bisnis runtime. Tidak ada fixture lokal yang menjadi sumber kebenaran setelah integrasi.
2. Semua write Firestore melewati repository/service typed milik AL atau kontrak service yang ia sepakati. Owner fitur tidak menulis ulang inisialisasi Firebase atau Security Rules sendiri.
3. Route hanya berada di `src/app/`. Components, hooks, repositories, Firebase config, types, dan utilitas berada di luar `src/app/`.
4. `users/{uid}` menjadi profil pelengkap akun Auth. Peran teknis hanya `student` atau `assistant`; UI menggunakan Praktikan dan Asisten.
5. Timestamp operasi memakai `serverTimestamp`; tidak memakai `new Date()` perangkat sebagai waktu kebenaran presensi, sesi, maupun keputusan izin.
6. Presensi dan izin memakai ID deterministik `{sessionId}_{studentId}`. Owner fitur harus menganggap error `already-exists` sebagai hasil idempoten/duplikat yang informatif, bukan menimpa dokumen.
7. Nilai `EXPO_PUBLIC_*` bukan tempat menyimpan rahasia. API key AI diletakkan pada Cloud Function/proxy atau mekanisme server aman; Galang dan Jesica tidak boleh membundelnya ke client.
8. Perubahan kontrak data, route root, Firebase config, `package.json`, Security Rules, dan types lintas domain membutuhkan persetujuan Abhi dan owner file sebelum merge.

## 3 Kontrak Data Minimum

```ts
type UserRole = 'assistant' | 'student';
type SessionStatus = 'scheduled' | 'open' | 'closed';
type LeaveStatus = 'pending' | 'approved' | 'rejected';
type AiStatus = 'pending' | 'success' | 'failed';

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  identifier: string;
  createdAt: Timestamp;
};

type PracticumClass = {
  id: string;
  practicumName: string;
  className: string;
  lab: string;
  assistantIds: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type LabSession = {
  id: string;
  classId: string;
  title: string;
  location: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  status: SessionStatus;
  openedBy?: string;
  openedAt?: Timestamp;
  closedBy?: string;
  closedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type AttendanceRecord = {
  id: `${string}_${string}`;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  attendedAt: Timestamp;
};

type LeaveRequest = {
  id: `${string}_${string}`;
  sessionId: string;
  classId: string;
  studentId: string;
  reason: string;
  status: LeaveStatus;
  aiStatus: AiStatus;
  aiCategory?: string | null;
  aiConfidence?: number | null;
  aiClassifiedAt?: Timestamp | null;
  reviewedBy?: string | null;
  reviewedAt?: Timestamp | null;
  reviewNote?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

`Timestamp` adalah tipe dari Firebase Firestore. Null/optional harus dipetakan konsisten di repository agar UI tidak perlu memahami detail serialisasi Firestore.

## 4 Detail Jobdesc

### 4.1 Abhi Project Manager dan Integrasi

**Task**

- **AB-01 Scope dan backlog:** menurunkan SRS Sprint 2 menjadi backlog, prioritas, serta acceptance criteria per FR.
- **AB-02 Kontrak lintas domain:** memfasilitasi kesepakatan skema, repository signature, route ownership, status, dan error contract sebelum coding integrasi.
- **AB-03 Dependency dan risiko:** membuat urutan kerja, mencatat blocker Firebase/API AI, serta memastikan ada fallback demo AI gagal.
- **AB-04 Integration review:** menelusuri route guard, role, listener, CRUD, presensi, izin, dan Security Rules bersama owner; melaporkan defect ke owner tanpa mengambil alih implementasi.
- **AB-05 Acceptance dan demo:** menjalankan dua skenario demo SRS memakai dua akun, mencatat hasil aktual, dan menyetujui Definition of Done.

**Dependency:** AB-01 dan AB-02 dilakukan sebelum merge kontrak bersama. AB-03 sampai AB-05 berjalan sepanjang sprint.

**Batas scope:** Abhi tidak menjadi owner Firebase config, UI, repository, atau screen. Perbaikan kode tetap dikembalikan kepada AL, Galang, Jesica, atau Kaka sesuai domain.

### 4.2 AL Programmer Data dan Praktikum

**Task**

- **AL-01 Firebase bootstrap:** menambahkan dan mengonfigurasi Firebase client yang kompatibel dengan Expo, satu file inisialisasi, emulator/dev configuration bila dipakai, serta memastikan tidak ada secret AI pada client.
- **AL-02 Shared types dan repository:** membuat types/repository Firestore untuk `users`, `classes`, membership, `sessions`, `attendance`, dan `leaveRequests`; menyediakan konverter, mapper timestamp, serta error contract yang dipakai owner lain.
- **AL-03 Kelas dan anggota:** UI/service CRUD kelas dan membership Asisten, validasi form, konfirmasi penghapusan, dan listener daftar kelas yang dikelola.
- **AL-04 Sesi dan jadwal:** CRUD sesi, validasi kelas/waktu/status awal `scheduled`, query jadwal per kelas, detail sesi read-only reusable, serta aturan hapus sebelum data turunan ada.
- **AL-05 Security Rules dan indeks:** menulis `firestore.rules`, konfigurasi indeks yang dibutuhkan query, dan test Emulator untuk autentikasi, peran, membership, write lintas kelas, duplikasi presensi, dan perubahan izin ilegal.
- **AL-06 Data integration QA:** menguji CRUD dari dua akun, listener cleanup, persistensi setelah restart, dan mapping data kosong/loading/error pada repository.

**Dependency:** AL-01/02 adalah fondasi Galang, Jesica, dan Kaka. AL-03/04 dapat dibuat paralel setelah kontrak disetujui. AL-05 ditinjau dengan setiap owner yang memiliki write.

**Batas scope:** AL menyediakan data/repository dan screen domain kelas/sesi, tetapi tidak mengimplementasikan login, aksi open/close, presensi UI, pengajuan izin UI, atau keputusan izin.

### 4.3 Galang Programmer Auth dan Navigasi

**Task**

- **GA-01 Auth service:** registrasi, login, logout, pemulihan session Firebase Authentication, pemetaan error auth, dan loading state.
- **GA-02 Profile bootstrap:** membuat profil `users/{uid}` setelah registrasi, memuat profil aktif, menangani profil hilang/role tidak valid, serta menampilkan identitas aktif.
- **GA-03 Role guard:** membuat provider/hook auth dan guard untuk kondisi belum login, loading, dan role Praktikan/Asisten; route manual ke area terlarang harus dialihkan aman.
- **GA-04 Expo Router shell:** memiliki `src/app/_layout.tsx`, layout auth, layout area Praktikan, layout area Asisten, dan navigasi menuju screen yang diekspor owner domain.
- **GA-05 Auth QA:** menguji registrasi, login gagal, logout, restart aplikasi, profil gagal dibuat, dan isolasi tampilan data privat setelah logout.

**Dependency:** GA-01 membutuhkan Firebase bootstrap AL. GA-02 membutuhkan kontrak `UserProfile`; GA-04 membutuhkan route screen signature dari AL, Jesica, dan Kaka.

**Batas scope:** Galang tidak membuat Security Rules, CRUD kelas/sesi, presensi, AI, ataupun keputusan izin. Ia boleh memasang guard yang mengonsumsi kontrak yang disediakan AL.

### 4.4 Jesica Programmer Praktikan dan AI

**Task**

- **JE-01 Jadwal Praktikan:** menyajikan kelas/session yang menjadi milik Praktikan menggunakan query/repository AL; tampilkan loading, empty, offline/error, dan detail sesi.
- **JE-02 Presensi:** tombol dan proses presensi hanya untuk Praktikan anggota pada sesi `open`; pakai ID `{sessionId}_{uid}`, waktu server, loading state, serta feedback sukses/duplikat/ditolak.
- **JE-03 Riwayat presensi:** listener riwayat presensi UID aktif, pemetaan sesi yang relevan, empty state, dan refresh setelah koneksi kembali.
- **JE-04 Form pengajuan izin:** validasi alasan, pembuatan dokumen `pending`, pencegahan submit ganda, status pengajuan, dan tampilan keputusan sendiri.
- **JE-05 AI classification client:** memanggil endpoint proxy/Cloud Function yang aman setelah pengajuan tersimpan, melakukan timeout/validasi respons, dan memperbarui field AI melalui contract yang diizinkan. Tidak memasukkan token atau membuat keputusan izin otomatis.
- **JE-06 Praktikan QA:** menguji siswa nonanggota, sesi belum dibuka/tertutup, presensi duplikat, alasan invalid, AI sukses, AI timeout/error, dan listener keputusan izin.

**Dependency:** JE-01 sampai JE-04 membutuhkan auth context Galang dan repository/query AL. JE-05 membutuhkan endpoint dan kontrak respons dari pengajar/proxy; UI/fallback tetap dapat dikerjakan tanpa endpoint aktif.

**Batas scope:** Jesica tidak membuka/menutup sesi, mengubah kelas, memutuskan izin, atau mengubah Security Rules sendiri.

### 4.5 Kaka Programmer Operasional Asisten

**Task**

- **KA-01 Kontrol sesi Asisten:** aksi buka `scheduled` dan tutup `open` dengan modal konfirmasi; write menyimpan UID serta waktu server dan menampilkan error transisi/otorisasi.
- **KA-02 Rekap presensi:** listener presensi per sesi, jumlah hadir, daftar Praktikan dan waktu hadir, serta loading/empty/error state real-time.
- **KA-03 Daftar izin Asisten:** query pengajuan per kelas/sesi yang dikelola, filter status, tampilan alasan, dan indikator hasil AI sebagai informasi pendukung.
- **KA-04 Keputusan manual izin:** kontrol Terima/Tolak, konfirmasi, catatan opsional, write `reviewedBy/reviewedAt`, dan pencegahan keputusan kedua pada pengajuan final.
- **KA-05 Operasional Asisten QA:** menguji status sesi, rekap dari akun Praktikan kedua, izin pending/AI gagal, keputusan lintas kelas yang ditolak, dan update status ke Praktikan secara real-time.

**Dependency:** KA-01 dan KA-02 membutuhkan session/attendance repository AL; KA-03/04 membutuhkan leave repository AL dan data yang dibuat Jesica. Semua screen membutuhkan auth/role guard Galang.

**Batas scope:** Kaka tidak melakukan CRUD definisi kelas/sesi, membuat presensi atas nama Praktikan, mengirim alasan ke AI, atau mengubah aturan akses secara mandiri.

## 5 Pemetaan Requirement ke Owner

| FR | Requirement | Owner implementasi | Dukungan/integrasi |
|---|---|---|---|
| FR-01 | Registrasi | Galang | AL: bootstrap/config profile repository |
| FR-02 | Login dan logout | Galang | AL: bootstrap Firebase |
| FR-03 | Profil dan akses peran | Galang | AL: schema/profile repository; Abhi: review |
| FR-04 | CRUD kelas dan anggota | AL | Galang: guard; Abhi: acceptance |
| FR-05 | CRUD sesi | AL | Kaka: lifecycle sesi |
| FR-06 | Jadwal Praktikan | Jesica | AL: query/detail reusable |
| FR-07 | Buka dan tutup sesi | Kaka | AL: session repository/Rules |
| FR-08 | Presensi Praktikan | Jesica | AL: attendance repository/Rules; Kaka: rekap |
| FR-09 | Rekap dan riwayat | Kaka: rekap; Jesica: riwayat | AL: query/index |
| FR-10 | Pengajuan izin | Jesica | AL: repository/Rules |
| FR-11 | Klasifikasi AI | Jesica | Abhi: koordinasi API; AL: penyimpanan contract bila perlu |
| FR-12 | Pemeriksaan izin | Kaka | AL: repository/Rules; Jesica: update tampilan Praktikan |
| FR-13 | Real-time dan persistensi | Semua owner | AL: query/listener contract; Abhi: integrasi |
| FR-14 | Validasi dan error | Owner fitur masing-masing | Abhi: review skenario tepi |
| FR-15 | Proteksi data | AL | Semua owner menguji deny scenario domainnya |

## 6 Urutan Implementasi

### Tahap 1 Kontrak dan Fondasi

1. Abhi menetapkan backlog, acceptance, contract meeting, dan file ownership.
2. AL menyelesaikan Firebase bootstrap, types, repository skeleton, Firestore rules baseline, dan dev seed minimal.
3. Galang menyelesaikan auth provider, profile bootstrap, serta route guard/shell.

**Keluar tahap:** akun dapat login, profil valid dapat dimuat, dan route peran terlindungi.

### Tahap 2 Implementasi Paralel

- AL membuat CRUD kelas, anggota, dan sesi beserta query jadwal.
- Jesica membuat layar jadwal Praktikan, presensi, riwayat, dan form izin menggunakan mock repository typed bila endpoint/backend belum siap.
- Kaka membuat control open/close, rekap, review izin, dan komponen keputusan berdasarkan contract yang sama.
- Galang menautkan screen pada shell dan menyelesaikan error/auth state.

**Keluar tahap:** setiap screen domain dapat diuji dengan data Firestore dan tidak membuat data lokal kanonis sendiri.

### Tahap 3 Integrasi Real-Time dan AI

1. Sambungkan write presensi Jesica ke listener rekap Kaka.
2. Sambungkan lifecycle sesi Kaka ke jadwal/detail AL dan layar Praktikan Jesica.
3. Sambungkan create izin Jesica ke daftar/review Kaka serta update keputusan kembali ke Praktikan.
4. Aktifkan endpoint AI aman, uji respons sukses, timeout, dan respons invalid.
5. Lengkapi Firestore indexes, Rules tests, dan skenario denied write.

**Keluar tahap:** dua alur demo SRS bekerja antar dua akun tanpa reload.

### Tahap 4 Penerimaan

Abhi menjalankan skenario demo, semua owner memperbaiki defect domainnya, lalu tim menjalankan lint dan typecheck. Sprint hanya ditutup jika Security Rules dan fallback AI gagal telah diuji.

## 7 Ownership File dan No Overlap

| Area atau path usulan | Owner | Aturan perubahan |
|---|---|---|
| `src/lib/firebase/*`, `src/services/*`, `src/types/*`, `firestore.rules`, `firestore.indexes.json` | AL | Perubahan lintas domain melalui review Abhi dan informasikan consumer. |
| `src/features/auth/*`, `src/features/identity/*`, `src/app/_layout.tsx`, route auth/shell | Galang | Owner screen memberi route export; root layout tidak diedit orang lain tanpa koordinasi. |
| `src/features/student/*`, route Praktikan, komponen form presensi/izin | Jesica | Mengonsumsi service AL dan context Galang. |
| `src/features/assistant/*`, route Asisten, komponen aksi/review/rekap | Kaka | Mengonsumsi service AL dan context Galang. |
| Dokumen backlog, acceptance, demo checklist, keputusan kontrak | Abhi | Tidak mengambil alih file kode domain. |
| `package.json`, `app.json`, konfigurasi build | Owner yang mengusulkan; Abhi koordinasi; AL/Galang review kompatibilitas | Tidak menambah dependency tanpa cek kompatibilitas Expo dan kebutuhan native. |

## 8 Dependency Matrix

| Consumer | Kontrak yang dibutuhkan | Owner penyedia | Cara tetap produktif bila belum siap |
|---|---|---|---|
| Galang | Firebase config dan `UserProfile` repository | AL | Selesaikan UI/provider dengan adapter typed/mock. |
| Jesica | Auth context, session/member/attendance/leave repository | Galang, AL | Kerjakan screen dengan contract mock tanpa membuat state produksi kedua. |
| Kaka | Auth context, session/attendance/leave repository | Galang, AL | Kerjakan modal/list/review dengan service interface; tunda write nyata. |
| AL | UID/role untuk batas query UI | Galang | Gunakan input parameter UID/role di repository; tidak bergantung pada UI. |
| Jesica | Endpoint dan format respons AI | Pengajar/proxy, dikoordinasikan Abhi | Selesaikan create request + `aiStatus: failed/pending` fallback. |
| Semua | Acceptance, keputusan conflict, akun demo | Abhi | Catat blocker dan gunakan fixture Firestore seed resmi. |

## 9 Definition of Done per Programmer

- Requirement dan acceptance domain terpenuhi, termasuk state loading, empty, invalid, error, dan offline yang relevan.
- Tidak ada write yang mengandalkan UI guard saja; Rules mengizinkan flow sah dan menolak flow ilegal.
- Listener dibersihkan, query dibatasi pada data yang berwenang, dan data tidak disalin menjadi sumber kebenaran lokal.
- Tidak ada token/kata sandi/rahasia AI di repository, console log, atau variabel `EXPO_PUBLIC_*`.
- Kode mengikuti TypeScript, struktur Expo Router, serta ownership file; perubahan lintas domain sudah dikoordinasikan.
- Owner menguji kasus happy path dan minimal satu deny/error path sebelum menyerahkan ke Abhi.
- Pada akhir sprint, `npx expo lint` dan `npx tsc --noEmit` dijalankan. Kegagalan yang tersisa tidak boleh disembunyikan dari acceptance report.

## 10 Ringkasan Beban Kerja

```text
Abhi    -> PM: scope, kontrak, dependency, review, acceptance, demo
AL      -> data Firebase, repository, Rules, kelas, anggota, sesi
Galang  -> Authentication, profil/role, auth guard, Expo Router shell
Jesica  -> jadwal Praktikan, presensi, riwayat, izin, pemanggilan AI aman
Kaka    -> buka/tutup sesi, rekap presensi, review dan keputusan izin
```

Keempat programmer dapat mengembangkan domain secara paralel setelah AL dan Galang menyediakan kontrak minimum. Abhi menjaga agar batas domain tetap jelas dan hasil akhir memenuhi dua skenario demo pada SRS Sprint 2.
