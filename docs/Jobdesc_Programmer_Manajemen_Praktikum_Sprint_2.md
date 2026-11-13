# Sistem Manajemen Praktikum Jobdesc Programmer Sprint 2

## 1 Tujuan Pembagian

Sprint 2 dikerjakan oleh Abhi sebagai Project Manager dan tiga programmer: AL, Galang, serta Kaka. Pembagian memakai vertical slice: setiap programmer menyelesaikan satu domain dari UI, validasi, repository Firestore, listener real-time, state error, sampai pengujian domainnya.

| Anggota | Peran | Domain mandiri |
|---|---|---|
| Abhi | Project Manager | Scope, kontrak, akses Firebase, acceptance, integrasi akhir, dan demo; tidak memiliki fitur implementasi. |
| AL | Programmer Autentikasi dan Presensi | Registrasi/login/role, presensi Praktikan, riwayat pribadi, dan rekap Asisten. |
| Galang | Programmer Manajemen Praktikum | Kelas, anggota, jadwal, sesi, serta buka/tutup sesi. |
| Kaka | Programmer Izin dan AI | Pengajuan izin, klasifikasi AI, daftar izin, serta keputusan Asisten. |

## 2 Pembagian SRS atau Fitur

Abhi - PM: menyusun backlog, memfasilitasi kontrak data, menyediakan akses Firebase project dan akun demo, melakukan integration review, serta menjalankan acceptance test. Abhi tidak mengambil ownership implementasi kode fitur.

AL - FR-01: Sebagai pengguna, saya dapat registrasi akun menggunakan Firebase Authentication.

AL - FR-02: Sebagai pengguna, saya dapat login, sesi saya dipulihkan, dan saya dapat logout.

AL - FR-03: Sebagai pengguna, saya hanya dapat mengakses fitur sesuai peran Praktikan atau Asisten.

AL - FR-08: Sebagai Praktikan, saya dapat melakukan presensi satu kali ketika sesi dibuka.

AL - FR-09: Sebagai Praktikan, saya dapat melihat riwayat presensi; sebagai Asisten, saya dapat melihat rekap kehadiran real-time.

Galang - FR-04: Sebagai Asisten, saya dapat CRUD kelas dan anggota praktikum.

Galang - FR-05: Sebagai Asisten, saya dapat CRUD sesi praktikum.

Galang - FR-06: Sebagai Praktikan, saya dapat melihat jadwal dan detail sesi kelas saya.

Galang - FR-07: Sebagai Asisten, saya dapat membuka dan menutup sesi praktikum.

Kaka - FR-10: Sebagai Praktikan, saya dapat mengajukan izin untuk sesi tertentu dengan alasan yang valid.

Kaka - FR-11: Sebagai Praktikan, saya dapat melihat klasifikasi AI atas alasan izin sebagai informasi pendukung.

Kaka - FR-12: Sebagai Asisten, saya dapat memeriksa, menerima, atau menolak pengajuan izin secara manual.

### 2.1 Requirement Lintas Fitur

| Kode | Pembagian owner |
|---|---|
| FR-13 Sinkronisasi real-time dan persistensi | AL: `users` dan `attendance`; Galang: `classes`, `members`, `sessions`; Kaka: `leaveRequests`. |
| FR-14 Validasi dan penanganan kesalahan | Masing-masing owner menangani input invalid, loading, empty state, koneksi, retry, dan error pada domainnya. |
| FR-15 Proteksi data | AL: Rules `users` dan `attendance`; Galang: Rules `classes`, `members`, `sessions`; Kaka: Rules `leaveRequests`. Abhi mengoordinasikan integration review. |

## 3 Kontrak Awal untuk Kerja Paralel

Sebelum coding, Abhi memfasilitasi kesepakatan kontrak berikut. Programmer dapat menggunakan mock/adapter dengan signature sama sehingga pekerjaan sehari-hari tidak saling memblokir.

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
```

Aturan kontrak:

1. ID presensi dan izin selalu memakai `{sessionId}_{studentId}` agar Praktikan tidak dapat membuat catatan kedua pada sesi sama.
2. Waktu aksi bisnis memakai `serverTimestamp`; waktu perangkat hanya untuk tampilan sementara.
3. Feature module tidak boleh mengimpor state internal feature module lain. Data lintas domain hanya lewat interface/adapter dan kontrak bersama.
4. API key AI tidak boleh disimpan pada source code atau `EXPO_PUBLIC_*`; Kaka memakai Cloud Function/proxy aman atau endpoint yang tidak membutuhkan secret client.
5. Perubahan field kontrak harus disepakati Abhi dan owner yang terdampak sebelum merge.

## 4 Detail Jobdesc

### 4.1 Abhi Project Manager dan Integrasi

- **AB-01 Scope dan acceptance:** menurunkan SRS menjadi backlog serta acceptance criterion per FR.
- **AB-02 Contract kickoff:** menyepakati tipe minimum, status, ID deterministik, daftar route, dan error convention.
- **AB-03 Environment readiness:** menyediakan akses Firebase project, akun demo Praktikan/Asisten, konfigurasi aman, dan kontak API AI pengajar.
- **AB-04 Integration review:** memeriksa integrasi route, Firebase, listener, dan Rules; defect dikembalikan ke owner domain.
- **AB-05 Demo dan acceptance:** menjalankan dua skenario demo SRS serta memverifikasi lint/typecheck sebelum sprint ditutup.

**Batas scope:** Abhi tidak mengimplementasikan Auth, kelas/sesi, presensi, izin, AI, maupun Security Rules domain.

### 4.2 AL Programmer Autentikasi dan Presensi

**Task autentikasi**

- **AL-01 Registration:** form registrasi, validasi email/kata sandi/identitas, akun Firebase Authentication, dan profil `users/{uid}`.
- **AL-02 Login/logout:** form login, pemetaan error Auth, pemulihan sesi, serta logout yang membersihkan state privat UI.
- **AL-03 Profile dan role guard:** provider/hook auth, profil aktif, label identitas, peran `student`/`assistant`, dan pengalihan dari route terlarang.

**Task presensi**

- **AL-04 Presensi Praktikan:** flow presensi hanya pada sesi `open`, menggunakan ID `{sessionId}_{studentId}` dan waktu server.
- **AL-05 Anti-duplikasi dan riwayat:** tangani presensi yang sudah ada sebagai “sudah tercatat” tanpa overwrite; tampilkan riwayat presensi UID aktif secara real-time.
- **AL-06 Rekap Asisten:** tampilkan jumlah dan daftar hadir per sesi secara real-time, termasuk waktu hadir, loading, empty, dan error state.
- **AL-07 Rules dan QA:** menulis Rules `users` dan `attendance`; menguji registrasi/login/logout, route guard, sesi tertutup, user nonanggota, presensi duplikat, rekap listener, dan restart aplikasi.

**Artefak:** `feature/auth`, `feature/attendance`, adapter `AuthPort`/`AttendancePort`, UI autentikasi-presensi-rekap, serta fragment Rules `users` dan `attendance`.

**Kerja mandiri:** AL dapat memakai `SessionSummary` mock untuk presensi/rekap, sehingga tidak perlu menunggu implementasi kelas/sesi Galang selesai.

### 4.3 Galang Programmer Manajemen Praktikum

- **GA-01 Kelas dan anggota:** CRUD kelas, daftar anggota, validasi form, konfirmasi hapus, dan state kosong/error.
- **GA-02 Sesi:** CRUD sesi berisi judul, kelas, waktu, lokasi, status awal `scheduled`, serta validasi waktu mulai/selesai.
- **GA-03 Jadwal dan detail:** daftar jadwal, detail sesi, filter kelas terkait, listener perubahan sesi, dan state loading/empty/error.
- **GA-04 Lifecycle sesi:** aksi buka dari `scheduled` dan tutup dari `open`, konfirmasi aksi, UID Asisten, serta waktu server.
- **GA-05 Rules dan QA:** menulis Rules `classes`, `members`, `sessions`; menguji CRUD, transisi status, status real-time, nonanggota, dan persistensi data sesi.

**Artefak:** `feature/practicum`, adapter `PracticumPort`, UI kelas/sesi/jadwal, serta fragment Rules `classes`, `members`, dan `sessions`.

**Kerja mandiri:** Galang memakai `AuthUser` mock untuk hak akses dan tidak memerlukan presensi atau izin sebagai input pengembangan.

### 4.4 Kaka Programmer Izin dan AI

- **KA-01 Ajukan izin:** form alasan, validasi, pembuatan `leaveRequests/{sessionId}_{studentId}` berstatus `pending`, serta submit/error state.
- **KA-02 Klasifikasi AI:** panggil Cloud Function/proxy/API aman setelah pengajuan tersimpan; validasi kategori/skor; simpan `aiStatus`; tampilkan fallback bila API gagal/timeout.
- **KA-03 Izin saya:** tampilkan riwayat pengajuan Praktikan, status AI, dan keputusan Asisten secara real-time.
- **KA-04 Review Asisten:** daftar izin per kelas/sesi, alasan, hasil AI sebagai konteks, dan filter pending bila diperlukan.
- **KA-05 Keputusan izin:** aksi Terima/Tolak manual dengan konfirmasi, catatan opsional, `reviewedBy`, serta `reviewedAt`. AI tidak boleh memberi keputusan otomatis.
- **KA-06 Rules dan QA:** menulis Rules `leaveRequests`; menguji alasan invalid, izin duplikat, AI sukses/gagal, keputusan Asisten, dan update ke Praktikan.

**Artefak:** `feature/leave`, adapter `LeavePort`/`AiClassificationPort`, UI pengajuan-riwayat-review, serta fragment Rules `leaveRequests`.

**Kerja mandiri:** Kaka menggunakan `AuthUser` dan `SessionSummary` mock. Pengajuan sampai keputusan berada pada satu domain sehingga tidak perlu menunggu AL atau Galang.

## 5 Cara Kerja Paralel

1. **Kontrak awal:** Abhi menyelesaikan akses Firebase, akun demo, jenis data, daftar route, dan interface mock.
2. **Implementasi mandiri:** AL mengerjakan Auth+Attendance, Galang mengerjakan Praktikum, Kaka mengerjakan Izin+AI tanpa mengimpor internal state domain lain.
3. **Adapter Firebase:** setiap owner mengganti mock pada domainnya sendiri dengan adapter Firebase/Firestore untuk koleksi yang dimilikinya.
4. **Integrasi akhir:** Abhi memimpin penggabungan provider, route, konfigurasi Firebase, indeks, dan fragment Security Rules. Defect dikembalikan ke owner domainnya.

## 6 Ownership File dan No Overlap

| Area atau path usulan | Owner |
|---|---|
| `src/features/auth/*`, `src/features/attendance/*`, route auth/presensi/rekap, Rules `users` dan `attendance` | AL |
| `src/features/practicum/*`, route kelas/jadwal/sesi, Rules `classes`/`members`/`sessions` | Galang |
| `src/features/leave/*`, route izin/review, AI client/proxy contract, Rules `leaveRequests` | Kaka |
| Kontrak bersama, backlog, acceptance, daftar route, integration review | Abhi sebagai fasilitator |

## 7 Definition of Done

- User story domain terpenuhi dengan loading, empty, sukses, offline, validasi, dan error state.
- Modul dapat diuji menggunakan mock port tanpa menunggu programmer lain.
- Listener Firestore dibersihkan saat tidak digunakan dan data bisnis tidak diduplikasi sebagai state lokal kanonis.
- Presensi dan izin memakai ID deterministik serta tidak dapat ditimpa/duplikasi.
- AI tidak mengambil keputusan izin otomatis dan tidak membocorkan API secret.
- Setiap fragment Rules memiliki minimal satu pengujian allow dan deny.
- Setelah integrasi, lint dan typecheck proyek dijalankan sebelum Sprint selesai.

## 8 Ringkasan

```text
Abhi    -> PM, kontrak, akses Firebase, review, acceptance, demo
AL      -> Auth lengkap dan presensi lengkap
Galang  -> Kelas, anggota, jadwal, sesi, buka/tutup sesi
Kaka    -> Izin lengkap: ajukan, AI, riwayat, review, keputusan
```

Pembagian ini memastikan seluruh fitur dan koleksi memiliki owner yang jelas.
