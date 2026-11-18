# Catatan Perbaikan Hasil Testing — Sistem Manajemen Praktikum

Dokumen ini merangkum temuan evaluasi dan pengujian sistem (*testing defect report*) pada alur kerja Asisten Praktikum (Asprak) dan Praktikan, beserta spesifikasi teknis dan rencana perbaikan (*remediation plan*) yang harus diimplementasikan oleh tim pengembang.

---

## Ringkasan Temuan Defect

| No | Modul / Fitur | Masalah Saat Testing | Dampak | Prioritas |
|---|---|---|---|:---:|
| 1 | **Manajemen Anggota Kelas (Asprak)** | Penambahan praktikan masih menggunakan input teks manual (`TextInput` untuk Nama, NIM, UID) tanpa pencarian akun terdaftar. | Rawan salah ketik (*human error*), praktikan tidak terhubung dengan akun otentikasi nyata di Firestore, dan proses penambahan lambat. | **Tinggi (High)** |
| 2 | **Penjadwalan Sesi Praktikum (Asprak)** | Pemilihan tanggal dan jam masih menggunakan input *string* bebas (misal: "Senin, 25 Nov 2026" dan "08:00"), bukan menggunakan kalender dan slot jam baku. | Inkonsistensi format tanggal/waktu, tidak ada validasi rentang waktu baku, dan pengalaman pengguna (*UX*) kurang ramah. | **Tinggi (High)** |
| 3 | **Pemuatan Data Jadwal / Sesi (Praktikan)** | Muncul kegagalan (*error query / permission denied*) saat pengguna login dengan akun Praktikan. | Praktikan tidak dapat melihat daftar kelas dan sesi yang diikutinya di layar beranda dan jadwal. | **Kritis (Critical)** |

---

## 1. Perbaikan Fitur Penambahan Praktikan oleh Asprak

### 1.1 Kondisi Saat Ini (As-Is)
Pada komponen `src/features/practicum/components/ClassMembersModal.tsx`:
- Asprak diminta memasukkan Nama Praktikan, NIM, dan UID opsional ke dalam tiga kotak teks terpisah.
- Tidak ada mekanisme pengecekan apakah mahasiswa tersebut telah terdaftar di sistem.
- Aturan keamanan Firestore (`firestore.rules`) saat ini memblokir pembacaan daftar pengguna (`match /users/{userId} { allow list: if false; }`), sehingga antarmuka klien tidak dapat mengambil daftar akun praktikan yang terdaftar.

### 1.2 Kebutuhan Perbaikan (To-Be)
1. **Pencarian Praktikan Berbasis Dropdown / Modal Picker:**
   - Menghilangkan input manual Nama/NIM/UID untuk penambahan anggota.
   - Menggantinya dengan tombol **"Cari & Tambah Praktikan"** yang membuka antarmuka pencarian dengan dropdown hasil.
2. **Filter Pencarian Multi-Kriteria (Semua Bersifat Opsional):**
   - **Filter Nama:** Pencarian teks berdasarkan nama lengkap atau panggilan praktikan.
   - **Filter NIM:** Pencarian teks berdasarkan nomor induk mahasiswa (misal: `22/50xxxx/PA/xxxxx`).
   - **Filter Angkatan:** Dropdown pilihan tahun angkatan (misal: `2021`, `2022`, `2023`, `2024`, `2025`, `2026` atau `Semua Angkatan`). Filter angkatan dapat mengekstrak 2 digit awal dari format NIM atau mencocokkan field tahun masuk.
   - **Sifat Fleksibel:** Jika ketiga filter dikosongkan, dropdown menampilkan daftar seluruh praktikan yang terdaftar di sistem yang **belum** tergabung dalam kelas praktikum tersebut.
3. **Penyajian Hasil Dropdown:**
   - Setiap item menampilkan: **Nama Lengkap**, **NIM**, **Angkatan**, dan badge status apakah sudah terdaftar di kelas lain.
   - Asprak cukup mengetuk (*tap*) salah satu praktikan dari daftar untuk langsung mendaftarkannya ke subkoleksi `classes/{classId}/members/{studentUid}`.
4. **Pembaruan Firestore Security Rules:**
   - Mengubah aturan pada koleksi `users` agar pengguna dengan peran `assistant` dapat melakukan *query list* pengguna yang memiliki atribut `role == 'student'`.

---

## 2. Perbaikan Pemilihan Jadwal dan Slot Waktu Sesi

### 2.1 Kondisi Saat Ini (As-Is)
Pada komponen `src/features/practicum/components/SessionFormModal.tsx`:
- Field `date` berupa input teks bebas (default: `"Senin, 25 Nov 2026"`).
- Field `startsAt` dan `endsAt` berupa input teks manual (default: `"08:00"` dan `"10:30"`).
- Rentan terjadi kesalahan format penulisan waktu yang berakibat gagalnya perbandingan urutan waktu sesi.

### 2.2 Kebutuhan Perbaikan (To-Be)

#### A. Pemilihan Tanggal Berbasis Kalender
- Mengganti input teks tanggal dengan komponen **Kalender / Date Picker Interaktif** (menggunakan modal kalender visual atau pustaka kalender Expo/React Native).
- Asprak memilih tanggal melalui antarmuka kalender yang menampilkan tanggal, bulan, dan tahun secara akurat.
- Sistem secara otomatis memformat tanggal terpilih menjadi string tampilan yang rapi (misal: `"Senin, 25 November 2026"`) serta menyimpan nilai timestamp ISO sebagai acuan komputasi.

#### B. Pemilihan Waktu Berbasis Dropdown Slot Praktikum Baku
Mengganti input teks jam mulai dan selesai dengan **Dropdown Pilihan Slot Waktu** yang menyediakan **6 opsi**:

| Pilihan Slot | Jam Mulai | Jam Selesai | Keterangan |
|:---:|:---:|:---:|---|
| **Slot 1** | 08.00 | 10.00 | Sesi Pagi 1 |
| **Slot 2** | 10.10 | 12.10 | Sesi Pagi 2 |
| **Slot 3** | 13.00 | 15.00 | Sesi Siang 1 |
| **Slot 4** | 15.40 | 17.40 | Sesi Sore |
| **Slot 5** | 18.15 | 20.15 | Sesi Malam |
| **Opsi 6 (Kustom)** | *Input Bebas* | *Input Bebas* | **Jadwal di luar 5 pilihan baku di atas** |

**Logika Interaksi:**
- Ketika Asprak memilih salah satu dari **Slot 1 s.d. Slot 5**, field jam mulai dan selesai terisi dan terkunci secara otomatis sesuai rentang slot tersebut.
- Ketika Asprak memilih **Opsi 6 (Jadwal Kustom)**, antarmuka akan memunculkan pemilih waktu (*Time Picker*) atau field jam khusus agar Asprak dapat menentukan jam mulai dan jam selesai di luar slot reguler.

#### C. Validasi Logika Timestamp (Client, Adapter, & Firestore Rules)
Untuk memastikan nilai waktu sesi (`startsAt` dan `endsAt`) selalu valid secara komputasi dan aman dari manipulasi klien:
1. **Validasi Client (`src/features/practicum/validation.ts`):**
   - Hasil kombinasi tanggal kalender (`YYYY-MM-DD`) dan jam slot/kustom (`HH:mm`) wajib menghasilkan timestamp ISO-8601 yang valid (`!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())`).
   - Wajib memenuhi `end.getTime() > start.getTime()` (menolak waktu selesai yang sama dengan atau lebih awal dari waktu mulai, termasuk pada opsi **Jadwal Kustom**).
   - Untuk pembuatan sesi baru, `startsAt` tidak boleh berada di waktu yang sudah terlewat (`start.getTime() >= now`) agar Asprak tidak salah menjadwalkan sesi ke tanggal lampau.
2. **Validasi Adapter Firestore (`src/features/practicum/firestore-adapter.ts`):**
   - Baik `createSession` maupun `updateSession` wajib memverifikasi bahwa `startsAt` dan `endsAt` ter-parse menjadi `Date` yang valid (bukan `Invalid Date`) dan memenuhi `startDate < endDate` sebelum dikonversi ke `Timestamp.fromDate(...)`.
3. **Validasi Firestore Security Rules (`firestore.rules`):**
   - Pada `validSessionCreate()` dan `validSessionUpdate()`, pastikan `request.resource.data.startsAt is timestamp`, `request.resource.data.endsAt is timestamp`, serta `request.resource.data.startsAt < request.resource.data.endsAt`.
   - Timestamp audit (`createdAt`, `updatedAt`, `openedAt`, `closedAt`) tetap wajib menggunakan waktu server (`request.time`).

---

## 3. Investigasi & Perbaikan Error Query Login Praktikan

### 3.1 Akar Masalah (Root Cause Analysis)
Berdasarkan penelusuran kode pada `src/features/practicum/firestore-adapter.ts`:
1. **Query Collection Group Tanpa Indeks:**
   Pada fungsi `subscribeClasses` dan `subscribeSessions` untuk role `student`:
   ```ts
   const membersGroup = collectionGroup(db, 'members');
   const qMembers = query(membersGroup, where('userId', '==', studentId));
   ```
   Firebase mensyaratkan **Composite / Collection Group Index** untuk melakukan query subkoleksi lintas dokumen. Ketiadaan konfigurasi indeks pada Firestore memicu eksepsi:
   `FirebaseError: The query requires an index. You can create it here: ...`
2. **Pembatasan Rules pada Operasi List Sesi:**
   Pada `firestore.rules`:
   ```firestore
   match /sessions/{sessionId} {
     allow get, list: if isClassAssistant(resource.data.classId)
       || (signedIn() && exists(memberPath(resource.data.classId, request.auth.uid)));
   }
   ```
   Aturan `exists(memberPath(...))` di atas tidak dapat dievaluasi secara global ketika klien menjalankan query `collection(db, 'sessions')` tanpa membatasi query tersebut ke `classId` tertentu yang valid. Firestore menolak query secara preventif (*Security Rules are not filters*).
3. **Kegagalan Rantai Resolusi Dokumen (*Unresolved Promises*):**
   Proses *listening* sesi praktikan bergantung pada hasil query anggota kelas terlebih dahulu. Jika praktikan baru belum terdaftar di kelas mana pun atau proses resolusi *classIds* menghasilkan array kosong, query sesi menjadi *stalled* atau melempar error tak tertangani ke state aplikasi.

### 3.2 Rencana Perbaikan (Remediation Plan)

#### Solusi Rekayasa Data (Direkomendasikan)
Untuk menghilangkan ketergantungan pada query `collectionGroup` yang lambat dan memerlukan indeks khusus:
1. **Tambahkan Array `memberUids` pada Dokumen Kelas (`classes/{classId}`):**
   - Saat praktikan ditambahkan ke kelas, tambahkan UID praktikan ke array `memberUids: [uid1, uid2, ...]`.
   - Praktikan dapat langsung melakukan query kelas yang diikutinya dengan:
     ```ts
     const q = query(collection(db, 'classes'), where('memberUids', 'array-contains', studentId));
     ```
   - Query ini **tidak memerlukan collection group** dan didukung langsung oleh aturan Firestore standar.
2. **Query Sesi Terarah Berdasarkan `classId`:**
   - Setelah daftar `classIds` praktikan diperoleh, jalankan query sesi menggunakan filter `where('classId', 'in', classIdsChunk)` (maksimal 10-30 classId per batch).
   - Menghindari pemanggilan `query(collection(db, 'sessions'))` tanpa filter kelas.
3. **Fallback & State Penanganan Kosong:**
   - Jika praktikan belum terdaftar di kelas mana pun (`classIds.length === 0`), hentikan listener dan kembalikan array kosong `[]` secara langsung tanpa memicu error Firestore.

---

## 4. Pembagian Tanggung Jawab Perbaikan

Perbaikan ini dialokasikan ke masing-masing penanggung jawab domain:

| Area Perbaikan | Penanggung Jawab | Berkas yang Terdampak |
|---|:---:|---|
| **Filter & Dropdown Pencarian Praktikan** | **Abhi** (Praktikum & Kelas) | `src/features/practicum/components/ClassMembersModal.tsx`<br>`src/features/practicum/firestore-adapter.ts`<br>`firestore.rules` |
| **Kalender, Slot Waktu, & Validasi Timestamp Sesi** | **Abhi** (Praktikum & Sesi) | `src/features/practicum/components/SessionFormModal.tsx`<br>`src/features/practicum/validation.ts`<br>`src/features/practicum/firestore-adapter.ts`<br>`src/features/practicum/types.ts`<br>`firestore.rules` |
| **Penyelesaian Error Query Login Praktikan** | **Al** (Otorisasi & Adaptor) & **Abhi** | `src/features/practicum/firestore-adapter.ts`<br>`src/features/practicum/context.tsx`<br>`firestore.rules` |
| **Verifikasi & Acceptance Testing** | **Galang (PM)** | Pengujian alur tambah praktikan, input jadwal sesi, dan login praktikan |

---

## 5. Rencana Pengujian Ulang (Retesting Checklist)

- [x] **Test Case 1 (Cari Praktikan):** Asprak membuka modal anggota kelas -> mengetikkan nama/NIM/angkatan -> daftar dropdown menampilkan mahasiswa yang cocok -> memilih mahasiswa -> praktikan sukses terdaftar di kelas.
- [x] **Test Case 2 (Kalender Sesi):** Asprak membuat sesi baru -> mengetuk kalender -> memilih tanggal praktikum -> tanggal terformat dengan benar tanpa input manual string.
- [x] **Test Case 3 (Dropdown 6 Slot Jam & Validasi Timestamp):** Asprak memilih salah satu dari Slot 1-5 -> jam mulai dan selesai terisi otomatis. Memilih Slot 6 -> muncul pemilih waktu kustom; jika jam selesai <= jam mulai, tanggal/jam lampau saat buat sesi baru, atau payload bukan timestamp valid, sistem menolak dan menampilkan pesan error yang jelas.
- [x] **Test Case 4 (Login Praktikan):** Login menggunakan akun mahasiswa -> halaman beranda dan jadwal langsung menampilkan kelas/sesi yang diikuti tanpa error query pada konsol/antarmuka.
- [x] **Test Case 5 (Akun Baru / Tanpa Kelas):** Login menggunakan akun mahasiswa baru yang belum memiliki kelas -> antarmuka menampilkan *empty state* yang informatif, bukan pesan error Firestore.
