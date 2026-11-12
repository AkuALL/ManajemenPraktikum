# Sistem Manajemen Praktikum Jobdesc Programmer Sprint 2

## 1 Tujuan Pembagian

Sprint 2 memakai pembagian berbasis **fitur lengkap** atau vertical slice. Setiap programmer memiliki alur fitur dari UI, validasi, repository Firestore, listener real-time, state loading/error, sampai pengujian domainnya sendiri. Dengan demikian, tidak ada programmer yang perlu menunggu fitur programmer lain selesai untuk mulai mengerjakan fiturnya.

Pembagian ini tidak berarti fitur akhir tidak akan diintegrasikan. Firebase project, kontrak data, dan route list disepakati lebih dahulu sebagai input bersama. Pada tahap implementasi, setiap programmer boleh memakai adapter/mock yang mengikuti kontrak tersebut; integrasi Firestore nyata dilakukan setelah modulnya siap.

| Anggota | Peran | Domain mandiri |
|---|---|---|
| Abhi | Project Manager | Scope, kontrak, akses Firebase, acceptance, integrasi akhir, dan demo; tidak memiliki fitur implementasi. |
| AL | Programmer Autentikasi | Registrasi, login, logout, profil, peran, dan auth guard. |
| Galang | Programmer Manajemen Praktikum | Kelas, anggota, jadwal, sesi, serta buka/tutup sesi. |
| Jesica | Programmer Presensi | Presensi Praktikan, anti-duplikasi, riwayat pribadi, dan rekap Asisten. |
| Kaka | Programmer Izin dan AI | Pengajuan izin, klasifikasi AI, daftar izin, serta keputusan Asisten. |

## 2 Pembagian SRS atau Fitur

Abhi - PM: menyusun backlog, memfasilitasi kontrak data, menyediakan akses Firebase project dan akun demo, melakukan integration review, serta menjalankan acceptance test. Abhi tidak mengambil ownership implementasi kode fitur.

AL - FR-01: Pengguna dapat registrasi menggunakan Firebase Authentication.

AL - FR-02: Pengguna dapat login, pemulihan sesi, dan logout.

AL - FR-03: Aplikasi memuat profil pengguna, menampilkan fitur sesuai peran Praktikan/Asisten, dan melindungi route yang tidak berwenang.

Galang - FR-04: Asisten dapat CRUD kelas dan anggota praktikum.

Galang - FR-05: Asisten dapat CRUD sesi praktikum.

Galang - FR-06: Praktikan dapat melihat jadwal dan detail sesi kelas yang diikutinya.

Galang - FR-07: Asisten dapat membuka sesi terjadwal dan menutup sesi yang sedang berlangsung.

Jesica - FR-08: Praktikan dapat melakukan presensi satu kali pada sesi yang sedang dibuka.

Jesica - FR-09: Praktikan dapat melihat riwayat presensi dan Asisten dapat melihat rekap kehadiran secara real-time.

Kaka - FR-10: Praktikan dapat mengajukan izin untuk sesi tertentu dengan alasan yang valid.

Kaka - FR-11: Sistem mengirim alasan izin ke API AI dan menampilkan hasil klasifikasi hanya sebagai informasi pendukung.

Kaka - FR-12: Asisten dapat melihat pengajuan izin, lalu menerima atau menolak secara manual.

### 2.1 Requirement Lintas Fitur

| Kode | Pembagian tanpa saling menunggu |
|---|---|
| FR-13 Sinkronisasi real-time dan persistensi | Setiap owner memasang listener hanya pada koleksi domainnya: AL `users`, Galang `classes`/`members`/`sessions`, Jesica `attendance`, Kaka `leaveRequests`. |
| FR-14 Validasi dan penanganan kesalahan | Setiap owner menangani input invalid, loading, empty state, gangguan koneksi, retry, dan error fitur miliknya. |
| FR-15 Proteksi data | Rules dipecah sebagai fragment per koleksi: AL `users`, Galang `classes`/`members`/`sessions`, Jesica `attendance`, Kaka `leaveRequests`. Abhi menggabungkan dan meninjau skenario integration test tanpa mengambil alih implementasi domain. |

## 3 Kontrak Awal yang Dibekukan Sebelum Coding

Abhi memfasilitasi kesepakatan berikut sebelum pekerjaan paralel dimulai. Kontrak ini adalah batas integrasi, bukan dependency pekerjaan harian. Bila Firebase service belum aktif, programmer memakai mock dengan signature yang sama.

```ts
type UserRole = 'assistant' | 'student';
type SessionStatus = 'scheduled' | 'open' | 'closed';
type LeaveStatus = 'pending' | 'approved' | 'rejected';
type AiStatus = 'pending' | 'success' | 'failed';

type AuthUser = {
  uid: string;
  role: UserRole;
  displayName: string;
  identifier: string;
};

type SessionSummary = {
  id: string;
  classId: string;
  status: SessionStatus;
};

type AttendanceRecord = {
  id: `${string}_${string}`;
  sessionId: string;
  classId: string;
  studentId: string;
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
};
```

Aturan kontrak:

1. ID presensi dan izin selalu menggunakan `{sessionId}_{studentId}` agar satu Praktikan tidak dapat membuat catatan kedua pada sesi sama.
2. Waktu aksi bisnis memakai `serverTimestamp`; waktu perangkat hanya untuk tampilan sementara.
3. Nilai profile, session, attendance, dan leave request dibaca melalui interface/adapter. Feature module tidak boleh mengimpor state internal feature programmer lain.
4. Jika field kontrak berubah, Abhi menyetujui perubahan dan seluruh owner diberi tahu sebelum merge.
5. API key AI tidak boleh ditaruh di source code atau `EXPO_PUBLIC_*`; Kaka menggunakan Cloud Function/proxy aman atau endpoint yang tidak membutuhkan secret client.

## 4 Detail Jobdesc Mandiri

### 4.1 Abhi Project Manager dan Integrasi

**Task**

- **AB-01 Scope dan acceptance:** mengubah SRS menjadi backlog/acceptance criterion per FR.
- **AB-02 Contract kickoff:** menyepakati tipe minimum, status, ID deterministik, route list, dan error convention sebelum coding.
- **AB-03 Environment readiness:** menyediakan akses Firebase project, akun demo Praktikan/Asisten, nilai konfigurasi yang aman, dan kontak API AI dari pengajar.
- **AB-04 Integration review:** memeriksa hasil integrasi tanpa menulis ulang fitur domain; blocker dikembalikan kepada owner yang tepat.
- **AB-05 Demo dan acceptance:** menjalankan dua skenario demo SRS, mencatat hasil aktual, dan memverifikasi lint/typecheck sebelum penutupan sprint.

**Batas scope:** tidak mengimplementasikan Auth, kelas/sesi, presensi, izin, AI, maupun Security Rules domain.

### 4.2 AL Programmer Autentikasi

**Task**

- **AL-01 Registration:** form registrasi, validasi email/kata sandi/identitas, pembuatan akun Firebase Authentication, dan pembuatan profil `users/{uid}`.
- **AL-02 Login/logout:** form login, pemetaan error Firebase Authentication, pemulihan sesi saat aplikasi dibuka, dan logout yang membersihkan state privat UI.
- **AL-03 Profile dan role:** auth provider/hook, profil aktif, label identitas, peran `student`/`assistant`, dan fallback jika profil tidak ada atau tidak valid.
- **AL-04 Auth guard:** guard untuk belum login, loading auth, route role Praktikan/Asisten, dan pengalihan aman dari route terlarang.
- **AL-05 Auth domain QA:** menguji register, login gagal, restart aplikasi, logout, profil rusak, dan akses route manual yang ditolak.

**Artefak mandiri:** feature/auth, adapter `AuthPort`, mock AuthPort, UI auth, serta fragment Rules `users`.

**Tidak menunggu:** Galang, Jesica, dan Kaka cukup menerima `AuthUser` dari mock atau auth provider. AL tidak perlu menunggu class/session/attendance/leave request untuk menyelesaikan domainnya.

### 4.3 Galang Programmer Manajemen Praktikum

**Task**

- **GA-01 Kelas dan anggota:** CRUD kelas, daftar anggota, validasi form, konfirmasi hapus, dan data kelas kosong/error.
- **GA-02 Sesi:** CRUD sesi dengan judul, kelas, waktu, lokasi, status awal `scheduled`, serta validasi waktu mulai/selesai.
- **GA-03 Jadwal dan detail:** daftar jadwal, detail sesi, filter/query kelas terkait, listener perubahan sesi, serta empty/loading/error state.
- **GA-04 Lifecycle sesi:** kontrol buka dari `scheduled` dan tutup dari `open`, dengan konfirmasi, UID Asisten, serta waktu server.
- **GA-05 Praktikum domain QA:** menguji CRUD, transisi sesi valid/tidak valid, listener status, nonanggota, dan persistensi data sesi.

**Artefak mandiri:** feature/practicum, adapter `PracticumPort`, mock PracticumPort, UI kelas/sesi/jadwal, serta fragment Rules `classes`, `members`, dan `sessions`.

**Tidak menunggu:** Galang memakai `AuthUser` mock untuk pengujian role/owner dan tidak menunggu presensi atau izin. Jesica/Kaka hanya menerima `SessionSummary` dari mock atau PracticumPort, tanpa mengakses state internal Galang.

### 4.4 Jesica Programmer Presensi

**Task**

- **JE-01 Presensi:** tombol/flow presensi Praktikan yang hanya aktif ketika `SessionSummary.status === 'open'`; write memakai ID `{sessionId}_{studentId}` dan waktu server.
- **JE-02 Anti-duplikasi:** tangani dokumen presensi yang telah ada sebagai status “sudah tercatat”, tanpa menimpa presensi pertama.
- **JE-03 Riwayat Praktikan:** daftar riwayat presensi milik UID aktif dengan listener, loading, empty, dan error state.
- **JE-04 Rekap Asisten:** daftar Praktikan hadir dan waktu kehadiran per sesi secara real-time, termasuk jumlah hadir serta state kosong.
- **JE-05 Attendance domain QA:** menguji sesi belum dibuka/ditutup, presensi berhasil, duplikasi, user nonanggota, listener rekap, dan restart aplikasi.

**Artefak mandiri:** feature/attendance, adapter `AttendancePort`, mock AttendancePort, UI presensi/riwayat/rekap, serta fragment Rules `attendance`.

**Tidak menunggu:** Jesica menggunakan `AuthUser` dan `SessionSummary` mock sehingga tidak perlu menunggu Auth atau Manajemen Praktikum selesai. Domain izin bukan input bagi rekap/presensi dan tidak dikerjakan di modul ini.

### 4.5 Kaka Programmer Izin dan AI

**Task**

- **KA-01 Ajukan izin:** form alasan, validasi, pembuatan `leaveRequests/{sessionId}_{studentId}` berstatus `pending`, serta status submit/error.
- **KA-02 Klasifikasi AI:** panggil Cloud Function/proxy/API aman setelah pengajuan tersimpan, validasi respons kategori/skor, simpan `aiStatus`, dan tampilkan fallback ketika API gagal/timeout.
- **KA-03 Izin saya:** riwayat dan detail pengajuan milik Praktikan, termasuk status AI dan keputusan Asisten secara real-time.
- **KA-04 Review Asisten:** daftar izin kelas/sesi, tampilan alasan dan hasil AI sebagai informasi pendukung, serta filter pending bila diperlukan.
- **KA-05 Keputusan izin:** Terima/Tolak manual dengan konfirmasi, catatan opsional, `reviewedBy`, serta `reviewedAt`. Tidak ada keputusan otomatis dari AI.
- **KA-06 Leave domain QA:** menguji alasan invalid, pengajuan duplikat, AI sukses, AI gagal, keputusan Asisten, dan update keputusan ke Praktikan.

**Artefak mandiri:** feature/leave, adapter `LeavePort` dan `AiClassificationPort`, mock kedua port, UI pengajuan/riwayat/review, serta fragment Rules `leaveRequests`.

**Tidak menunggu:** Kaka menggunakan `AuthUser` dan `SessionSummary` mock; ia mengelola pengajuan sampai keputusan dalam satu modul sehingga tidak menunggu Jesica. Kegagalan AI tidak boleh menghambat pengajuan izin.

## 5 Cara Kerja Paralel Tanpa Blocking

### Tahap 0 Kontrak

Abhi menyelesaikan AB-01 sampai AB-03. Hasilnya adalah kontrak data, daftar route, akses project Firebase, dan test account. Ini merupakan input awal bersama, bukan pekerjaan yang ditunggu dari programmer lain.

### Tahap 1 Implementasi Mandiri

- AL mengembangkan AuthPort dan layar autentikasi dengan mock/backend Firebase.
- Galang mengembangkan PracticumPort dan layar kelas/sesi dengan mock/backend Firestore.
- Jesica mengembangkan AttendancePort dan layar presensi/rekap dengan mock AuthUser/SessionSummary.
- Kaka mengembangkan LeavePort/AiClassificationPort dan layar izin dengan mock AuthUser/SessionSummary.

Tidak ada feature module yang mengimpor hook, state, atau komponen internal feature module lain. Semua integrasi hanya melalui kontrak pada Bagian 3.

### Tahap 2 Integrasi Adapter

Setelah UI/domain test selesai, setiap owner mengganti mock port pada modulnya dengan adapter Firestore/Firebase miliknya sendiri. Ini bukan pekerjaan lintas programmer karena setiap koleksi hanya memiliki satu owner.

### Tahap 3 Integrasi Aplikasi

Abhi memimpin pengecekan route, provider, konfigurasi Firebase, dan Rules gabungan. Jika ditemukan defect, owner domain memperbaiki modulnya. Pada tahap ini ada integrasi aplikasi yang tidak dapat dihindari, tetapi tidak ada dependency implementasi fitur harian.

## 6 Ownership File dan No Overlap

| Area atau path usulan | Owner | Aturan |
|---|---|---|
| `src/features/auth/*`, `src/features/identity/*`, route auth dan guard | AL | Hanya AL mengubah logic AuthPort dan Rules profile. |
| `src/features/practicum/*`, route kelas/jadwal/sesi | Galang | Hanya Galang mengubah PracticumPort dan Rules kelas/sesi. |
| `src/features/attendance/*`, route presensi/riwayat/rekap | Jesica | Hanya Jesica mengubah AttendancePort dan Rules presensi. |
| `src/features/leave/*`, route izin/review, AI client/proxy contract | Kaka | Hanya Kaka mengubah LeavePort, AiClassificationPort, dan Rules izin. |
| `src/contracts/sprint2.ts`, dokumen backlog/acceptance, daftar route | Abhi sebagai fasilitator | Perubahan membutuhkan persetujuan seluruh owner terdampak sebelum merge. |
| `firestore.rules` akhir, `firestore.indexes.json`, Firebase config final | Digabung pada integration review | Fragment Rules/indeks berasal dari owner koleksi; Abhi memimpin review dan owner domain menerapkan revisinya. |

## 7 Definition of Done

- Semua user story domain terpenuhi dengan validasi, loading, empty, sukses, offline, dan error state yang relevan.
- Module dapat diuji menggunakan mock port tanpa menunggu module programmer lain.
- Adapter Firebase/Firestore domain memakai listener sesuai koleksi, membersihkan listener, dan tidak membentuk sumber data lokal kedua.
- Presensi/izin tidak dapat menggandakan atau menimpa dokumen deterministik.
- AI tidak memutuskan izin otomatis dan tidak membocorkan API key/secret ke aplikasi.
- Fragment Security Rules domain memiliki skenario allow dan deny test.
- Setelah integrasi, lint dan typecheck proyek dijalankan sebelum Sprint dinyatakan selesai.

## 8 Ringkasan

```text
Abhi    -> PM, kontrak, akses Firebase, review, acceptance, demo
AL      -> Auth lengkap: registrasi, login, profil, role, guard
Galang  -> Praktikum lengkap: kelas, anggota, sesi, jadwal, buka/tutup
Jesica  -> Presensi lengkap: absen, anti-duplikasi, riwayat, rekap
Kaka    -> Izin lengkap: ajukan, AI, riwayat, review, keputusan
```

Pembagian ini menghilangkan dependency **antar fitur programmer saat pengerjaan**. Dependency yang tersisa hanya kontrak awal dan integrasi akhir aplikasi, yang dikelola Abhi agar tidak menjadi blocker pekerjaan harian.
