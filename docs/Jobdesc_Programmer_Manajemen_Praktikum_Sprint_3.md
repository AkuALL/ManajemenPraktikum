# Sistem Manajemen Praktikum — Jobdesc Programmer Sprint 3

## 1. Tujuan Pembagian dan Susunan Tim

Sprint 3 berfokus pada implementasi **Location-Based Attendance, Maps, dan Push Notification** di atas fondasi autentikasi dan Cloud Firestore yang telah dibangun pada Sprint 2. Tim terdiri dari **3 orang** dengan pembagian peran yang tegas: **Galang** bertindak sebagai **Project Manager (PM)** yang memimpin arsitektur, integrasi, dan penerimaan sistem tanpa menulis kode fitur, sementara implementasi teknis dibagi secara vertikal (*vertical slice*) kepada dua programmer: **Abhi** dan **Al**.

| Anggota | Peran | Tanggung Jawab & Domain Mandiri |
|---|---|---|
| **Galang** | **Project Manager (PM)** | Pengendalian *scope*, perumusan kontrak data, penyiapan konfigurasi Expo/Firebase, peninjauan integrasi (*integration review*), koordinasi *quality assurance*, dan orkestrasi skenario demo. **Tidak mengimplementasikan kode fitur.** |
| **Abhi** | **Programmer: Maps & Lab Activity** | Pengelolaan master data laboratorium (CRUD), halaman Peta Interaktif (Maps), penanda sebaran lab (*custom markers*), pelacakan posisi pengguna dinamis (*live user marker*), penyajian informasi aktivitas praktikum real-time (*active & upcoming session*), serta penanganan izin lokasi pada peta. |
| **Al** | **Programmer: Location Attendance & Push Notification** | Halaman khusus presensi mandiri, mesin validasi geofencing (algoritma Haversine & radius check), pencatatan presensi ber-audit lokasi di Firestore, subsistem registrasi *push token*, mesin pengiriman *push notification* pada 4 peristiwa penting, penanganan interaksi notifikasi (*deep link*), serta penanganan izin notifikasi/GPS. |

---

## 2. Pembagian SRS / Fitur (User Story Format)

**Galang - PM :** Sebagai Project Manager, saya menyusun backlog, memfasilitasi kontrak data, mengoordinasikan konfigurasi platform, melakukan integration review, dan menjalankan acceptance test 3 skenario demo tanpa mengambil kodingan fitur.

**Abhi - FR-07 :** Sebagai Asisten, saya dapat mengelola data laboratorium (nama, gedung, koordinat latitude/longitude, dan radius presensi) pada Cloud Firestore agar dapat digunakan sebagai acuan validasi presensi.

**Abhi - FR-08 :** Sebagai pengguna, saya dapat melihat peta interaktif yang menampilkan sebaran lokasi laboratorium di lingkungan Informatika menggunakan penanda (custom marker).

**Abhi - FR-09 :** Sebagai pengguna, saya dapat melihat marker posisi saya saat ini di peta yang diperbarui secara dinamis mengikuti pergerakan lokasi perangkat saya selama halaman peta dibuka.

**Abhi - FR-10 :** Sebagai pengguna, saya dapat memilih salah satu marker laboratorium pada peta untuk melihat detail laboratorium beserta informasi praktikum yang sedang berlangsung dan praktikum berikutnya secara real-time.

**Abhi - FR-16 :** Sebagai pengguna peta, saya memperoleh penanganan kondisi perangkat yang ramah ketika izin lokasi ditolak atau layanan GPS perangkat dinonaktifkan.

**Al - FR-01 :** Sebagai Praktikan, saya dapat mengakses halaman khusus presensi yang terpisah dari halaman detail sesi untuk melihat ringkasan sesi yang akan diikuti beserta status kesiapan presensi.

**Al - FR-02 :** Sebagai Praktikan, perangkat saya dapat memperoleh koordinat geografis terkini secara akurat saat saya membuka halaman presensi.

**Al - FR-03 :** Sebagai Praktikan, aplikasi memeriksa jarak saya ke laboratorium menggunakan formula Haversine untuk memvalidasi apakah saya berada di dalam atau di luar radius presensi yang ditentukan.

**Al - FR-04 :** Sebagai Praktikan, saya dapat melihat umpan balik visual mengenai jarak saya ke laboratorium dan status kelayakan presensi (dalam radius / di luar radius / sesi belum dibuka).

**Al - FR-05 :** Sebagai Praktikan yang berada di dalam radius saat sesi dibuka, saya dapat mengirimkan presensi dan mencatatkan data kehadiran beserta audit lokasi ke Firestore.

**Al - FR-06 :** Sebagai sistem, saya menolak pencatatan presensi apabila praktikan berada di luar radius, sesi tidak berstatus open, atau praktikan telah melakukan presensi pada sesi tersebut sebelumnya.

**Al - FR-11 :** Sebagai pengguna yang telah login, push token perangkat saya didaftarkan dan diperbarui secara otomatis pada Firestore agar saya dapat menerima notifikasi.

**Al - FR-12 :** Sebagai Praktikan, saya menerima push notification secara otomatis saat Asisten membuka sesi praktikum kelas saya.

**Al - FR-13 :** Sebagai Praktikan, saya menerima push notification saat Asisten mengubah jadwal atau memindahkan lokasi laboratorium praktikum saya.

**Al - FR-14 :** Sebagai Praktikan yang mengajukan izin, saya menerima push notification saat Asisten menerima atau menolak pengajuan izin saya.

**Al - FR-15 :** Sebagai pengguna, saya dapat mengetuk push notification yang masuk untuk diarahkan langsung (deep link) ke halaman yang relevan di dalam aplikasi.

**Al - FR-17 :** Sebagai Praktikan yang melakukan presensi atau menerima notifikasi, saya memperoleh penanganan kondisi perangkat yang jelas ketika izin notifikasi/lokasi ditolak, GPS tidak aktif, atau terjadi gangguan koneksi.

### 2.1 Rincian Task Programmer (Internal Tasks)

#### Galang — Project Manager (Non-Coding)
- **GA-01 — Backlog & Scope Enforcement:** Menjaga keselarasan implementasi dengan 7 kebutuhan fungsional dan 3 alur demo pada SRS Sprint 3.
- **GA-02 — Contract Kickoff:** Memfasilitasi kontrak antarmuka TypeScript untuk model `LabLocation`, `AttendanceAudit`, `PushNotificationPayload`, dan struktur *deep link*.
- **GA-03 — Platform & Environment Readiness:** Memastikan konfigurasi `app.json` (Google Maps API Key, izin native Android/iOS, Expo Notification credentials, dan Firebase Cloud Messaging) siap diuji pada Expo Dev Client atau perangkat fisik.
- **GA-04 — Integration Review:** Meninjau penggabungan kode, verifikasi bebas konflik file (*no overlap*), memeriksa konsistensi Security Rules Firestore, dan memvalidasi `npx expo lint` serta `npx tsc --noEmit`.
- **GA-05 — Demo & Acceptance Orchestration:** Menguji 3 alur utama (Presensi Berbasis Lokasi, Peta dan Informasi Lab, dan Notifikasi Kegiatan) bersama penguji/asisten.

#### Abhi — Programmer Maps & Lab Activity
- **AB-01 — Master Data Laboratorium (CRUD):** Menyediakan antarmuka dan Firestore repository untuk menambah, melihat, mengedit, dan menghapus laboratorium (`labs/{labId}`) beserta koordinat (*latitude, longitude*) dan radius batas (*radiusMeters*).
- **AB-02 — Interactive Maps Screen:** Mengimplementasikan layar Maps menggunakan pustaka peta berbasis Expo/React Native dengan kontrol *pan*, *zoom*, dan pemusatan lokasi.
- **AB-03 — Custom Lab Markers:** Menampilkan seluruh laboratorium aktif pada peta dengan penanda visual khusus (*custom pin/marker*) yang memuat nama lab dan indikator ketersediaan.
- **AB-04 — Dynamic Live User Location Tracking:** Mengintegrasikan `expo-location` (`watchPositionAsync`) untuk menampilkan *marker* posisi pengguna secara dinamis dan bergerak mulus sesuai pergerakan fisik perangkat di peta.
- **AB-05 — Real-Time Lab Activity Explorer:** Menampilkan *bottom sheet / modal* interaktif saat marker lab dipilih, menyajikan sesi praktikum yang sedang berjalan (`status: open`) dan praktikum berikutnya (`status: scheduled`) dari Firestore secara real-time.
- **AB-06 — Map Permissions & GPS Handling:** Menangani kondisi izin lokasi perangkat pada modul peta (dialog permohonan izin, pesan penolakan, deteksi GPS tidak aktif, dan tombol pintas ke pengaturan).
- **AB-07 — Lab Security Rules & Domain QA:** Menyusun fragment Firestore Security Rules untuk koleksi `labs` dan menguji pemuatan peta, pergerakan marker, serta akurasi query sesi aktif/berikutnya.

#### Al — Programmer Location Attendance & Push Notification
- **AL-01 — Dedicated Attendance Screen:** Mengembangkan halaman khusus presensi mandiri (terpisah dari detail sesi), memuat header sesi, ringkasan waktu, indikator status GPS, kartu perbandingan jarak vs radius, dan tombol presensi terproteksi.
- **AL-02 — Geofencing & Distance Validation Engine:** Mengimplementasikan hook/utilitas kalkulasi formula *Haversine* untuk menghitung jarak nyata antara koordinat GPS perangkat praktikan dan koordinat laboratorium sesi secara real-time.
- **AL-03 — Location Audit Attendance Submission:** Menuliskan catatan presensi ke `attendance/{sessionId}_{studentId}` dengan menyertakan audit lokasi (`latitude`, `longitude`, `accuracy`, `distanceMeters`, `isWithinRadius`), serta memastikan validasi anti-duplikasi dan status sesi `open`.
- **AL-04 — Push Token Registration Subsystem:** Mengintegrasikan `expo-notifications` untuk meminta izin notifikasi, mengambil *Expo Push Token / FCM Token*, dan menyimpannya ke dokumen profil pengguna `users/{uid}/pushTokens`.
- **AL-05 — Event-Driven Notification Dispatcher:** Mengembangkan *service* pengiriman push notification yang terpicu secara otomatis ketika asisten membuka sesi praktikum, mengubah jadwal/lab, atau menyetujui/menolak pengajuan izin.
- **AL-06 — Notification Listener & Deep Linking:** Menangani penerimaan notifikasi saat aplikasi berada di *foreground* maupun *background*, serta mengarahkan navigasi (*deep linking*) saat notifikasi diketuk (membuka Halaman Presensi atau Riwayat Izin).
- **AL-07 — Attendance & Notification Permissions Handling:** Menangani kasus penolakan izin notifikasi, GPS mati saat presensi, koordinat timeout/lemah, dan memberikan umpan balik visual yang jelas.
- **AL-08 — Attendance Security Rules & Domain QA:** Menyusun fragment Security Rules untuk memvalidasi atribut audit lokasi presensi dan pembaruan push token, serta menguji skenario presensi dalam vs luar radius.

---

## 3. Kontrak Awal untuk Kerja Paralel

Agar Abhi dan Al dapat langsung bekerja secara mandiri tanpa saling memblokir (*zero blocking dependency*), disepakati kontrak data TypeScript berikut:

```ts
// src/types/sprint3-contracts.ts

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export type LabLocation = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
};

export type SessionLocationSummary = {
  sessionId: string;
  classId: string;
  title: string;
  labId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: 'scheduled' | 'open' | 'closed';
  startsAt: string;
  endsAt: string;
};

export type AttendanceAudit = {
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  attendedAt: string; // ISO string / serverTimestamp
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceMeters: number;
  isWithinRadius: boolean;
};

export type NotificationType =
  | 'SESSION_OPENED'
  | 'SCHEDULE_CHANGED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED';

export type PushNotificationPayload = {
  recipientUids: string[];
  type: NotificationType;
  title: string;
  body: string;
  data: {
    sessionId?: string;
    classId?: string;
    leaveRequestId?: string;
    route?: string;
  };
};

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  radiusMeters: number;
  userCoords: Coordinates | null;
  labCoords: Coordinates;
  error?: string | null;
}
```

### Aturan Kontrak:
1. **Pemisahan Sumber Kebenaran:** Data koordinat laboratorium kanonis bersumber dari koleksi `labs`. Saat asisten membuat atau memperbarui sesi praktikum, data koordinat dan radius lab dicatat ke dalam dokumen `sessions/{sessionId}` untuk kecepatan baca saat validasi presensi.
2. **Formula Haversine Mandiri:** Formula Haversine diletakkan pada `src/utils/haversine.ts` sehingga dapat digunakan baik oleh antarmuka presensi (Al) maupun pengujian/pengecekan jarak visual pada peta (Abhi).
3. **Trigger Notifikasi Modular:** Fungsi pengiriman notifikasi `sendPushNotification(payload)` diekspor sebagai fungsi mandiri di `src/services/notification-service.ts`. Kapan pun modul sesi milik Abhi atau modul izin melakukan pembaruan status, modul tersebut cukup memanggil fungsi *dispatcher* ini dengan payload yang sesuai tanpa perlu memahami detail internal FCM/Expo Push.

---

## 4. Rincian Pekerjaan dan Matriks Traceability (Zero Dependency)

| Kode FR SRS | Deskripsi Kebutuhan | Owner Tunggal | Task Internal | Lingkup / Modul |
|---|---|:---:|---|---|
| **FR-01** | Halaman Presensi Mandiri | **Al** | `AL-01` | Feature Screen UI Presensi Terpisah |
| **FR-02** | Perolehan Geoposisi Pengguna | **Al** | `AL-02` | Core Location GPS Hook & Akurasi |
| **FR-03** | Perhitungan Jarak & Validasi Radius | **Al** | `AL-02` | Geofencing Engine & Formula Haversine |
| **FR-04** | Umpan Balik Status Kelayakan Presensi | **Al** | `AL-01`, `AL-02` | UI Validation Feedback & Radius Badge |
| **FR-05** | Presensi dengan Audit Lokasi | **Al** | `AL-03` | Firestore Attendance Service & Audit |
| **FR-06** | Pencegahan Duplikasi & Pelanggaran Presensi | **Al** | `AL-03`, `AL-08` | Attendance Rules & Validation Logic |
| **FR-07** | Pengelolaan Data Laboratorium (CRUD) | **Abhi** | `AB-01`, `AB-07` | Lab Management Feature & Firestore `labs` |
| **FR-08** | Peta Sebaran Lab Interaktif | **Abhi** | `AB-02`, `AB-03` | Interactive Maps Screen & Custom Pins |
| **FR-09** | Live User Marker Dinamis | **Abhi** | `AB-04` | Map Location Watcher & Animated Marker |
| **FR-10** | Info Aktivitas Lab Real-Time | **Abhi** | `AB-05` | Lab Activity Sheet & Session Queries |
| **FR-11** | Registrasi Push Token | **Al** | `AL-04` | Push Notification Token Service & `users` |
| **FR-12** | Notifikasi Sesi Dibuka | **Al** | `AL-05` | Event Push Service Pembukaan Sesi |
| **FR-13** | Notifikasi Perubahan Jadwal | **Al** | `AL-05` | Event Push Service Perubahan Jadwal |
| **FR-14** | Notifikasi Keputusan Izin | **Al** | `AL-05` | Event Push Service Keputusan Izin |
| **FR-15** | Deep Linking Notifikasi | **Al** | `AL-06` | Notification Routing Handler |
| **FR-16** | Penanganan Kondisi Perangkat pada Peta | **Abhi** | `AB-06` | Map Permissions, GPS Check, & Error State |
| **FR-17** | Penanganan Kondisi Perangkat Presensi & Notifikasi | **Al** | `AL-07` | Attendance/Notif Perms & Error State |

---

## 5. Cara Kerja Paralel dan Siklus Pengembangan

```mermaid
flowchart TD
    subgraph Tahap 1: Inisiasi & Kontrak
        PM1["Galang (PM): Finalisasi Kontrak TypeScript, Backlog, & app.json plugins"]
    end

    subgraph Tahap 2: Pengerjaan Paralel Mandiri
        subgraph Modul Abhi
            AB_A["AB-01: CRUD Laboratorium Firestore"] --> AB_B["AB-02/03: Layar Maps & Custom Marker"]
            AB_B --> AB_C["AB-04: Live User Location Watcher"]
            AB_C --> AB_D["AB-05: Real-time Activity Bottom Sheet"]
            AB_D --> AB_E["AB-06/07: Map Permissions & Lab Rules"]
        end

        subgraph Modul Al
            AL_A["AL-01: Halaman Presensi Mandiri"] --> AL_B["AL-02: Geofencing Engine & Haversine"]
            AL_B --> AL_C["AL-03: Presensi + Audit Lokasi Firestore"]
            AL_D["AL-04: Push Token Registration"] --> AL_E["AL-05: Event-Driven Notification Engine"]
            AL_E --> AL_F["AL-06: Deep Linking & Foreground Handler"]
            AL_F --> AL_G["AL-07/08: Attendance Rules & Perms Handling"]
        end
    end

    subgraph Tahap 3: Integrasi Antarmodul
        INT1["Penyambungan Trigger Notifikasi: Buka Sesi (Abhi) memanggil Notification Service (Al)"]
        INT2["Validasi Sesi Lab: Halaman Presensi (Al) membaca koordinat lab dari Sesi (Abhi)"]
    end

    subgraph Tahap 4: Review, Pengujian, & Demo
        PM2["Galang (PM): Verifikasi Lint, Typecheck, Security Rules Test, & 3 Skenario Demo"]
    end

    Tahap 1 --> Tahap 2
    Tahap 2 --> Tahap 3
    Tahap 3 --> Tahap 4
```

1. **Langkah 1 (Kontrak Awal):** Galang mempublikasikan berkas kontrak `src/types/sprint3-contracts.ts` dan formula `haversine.ts`. Abhi dan Al dapat menggunakan mock data lokal berbasis kontrak tersebut untuk pengujian UI masing-masing.
2. **Langkah 2 (Implementasi Vertikal):**
   - Abhi menyelesaikan modul peta dan data laboratorium di folder `src/features/maps/` dan `src/features/labs/`.
   - Al menyelesaikan modul presensi mandiri dan mesin notifikasi di folder `src/features/attendance/` dan `src/services/notification/`.
3. **Langkah 3 (Penyambungan Terarah):**
   - Abhi menghubungkan tombol "Buka Sesi" dengan pemanggilan `sendPushNotification()` yang disediakan oleh Al.
   - Al memastikan Halaman Presensi membaca data koordinat laboratorium dari dokumen sesi yang dikelola oleh modul praktikum/lab.
4. **Langkah 4 (Penerimaan Sistem):** Galang memimpin uji integrasi menyeluruh, memastikan tidak ada regresi pada fitur Sprint 1 dan Sprint 2, serta memastikan ketiga alur demonstrasi berjalan sempurna.

---

## 6. Kepemilikan Berkas (*File Ownership & No-Overlap*)

Untuk mencegah konflik penggabungan (*merge conflict*), setiap berkas dan folder memiliki penanggung jawab tunggal (*single owner*):

| Jalur Berkas / Direktori | Penanggung Jawab | Keterangan |
|---|:---:|---|
| `docs/SRS_Manajemen_Praktikum_Sprint_3.md` | Galang (PM) | Dokumen spesifikasi kebutuhan sistem Sprint 3 |
| `docs/Jobdesc_Programmer_Manajemen_Praktikum_Sprint_3.md` | Galang (PM) | Dokumen pembagian kerja tim Sprint 3 |
| `app.json`, `package.json` | Galang (PM) | Konfigurasi plugins native (maps, location, notifikasi) |
| `src/types/sprint3-contracts.ts` | Galang (PM) | Kontrak data global lintas domain Sprint 3 |
| `src/utils/haversine.ts` | Al | Formula perhitungan jarak geofencing global |
| `src/app/maps.tsx`, `src/app/(tabs)/maps.tsx` | Abhi | Route layar utama Peta Laboratorium |
| `src/app/labs/*` | Abhi | Route pengelolaan master data lab oleh Asisten |
| `src/features/maps/*` | Abhi | Komponen peta, marker custom, watcher GPS peta |
| `src/features/labs/*` | Abhi | Service CRUD lab, form lab, modal aktivitas lab |
| `src/app/presensi.tsx`, `src/app/attendance/verify.tsx` | Al | Route layar mandiri Presensi Berbasis Lokasi |
| `src/features/attendance/LocationAttendanceCard.tsx` | Al | Komponen visual verifikasi jarak dan status radius |
| `src/features/attendance/use-geofence-attendance.ts` | Al | Hook validasi geofencing, GPS, dan submit presensi |
| `src/services/notification-service.ts` | Al | Mesin pengiriman push notification & FCM/Expo dispatch |
| `src/hooks/use-push-notifications.ts` | Al | Hook registrasi push token & listener notifikasi |
| `firestore.rules` (Fragment Labs) | Abhi | Security Rules untuk koleksi `labs` |
| `firestore.rules` (Fragment Attendance & Users) | Al | Security Rules untuk audit presensi & push tokens |

---

## 7. Kriteria Penyelesaian (*Definition of Done*)

Sebuah fitur pada Sprint 3 dinyatakan selesai (*Done*) apabila:

1. **Kesesuaian Fungsional:** Seluruh kriteria penerimaan pada FR terkait telah terpenuhi (termasuk penanganan kasus gagal, di luar radius, dan izin ditolak).
2. **Kemandirian Modul:** Komponen dapat dijalankan dan diuji dengan mock interface tanpa memutus alur kerja programmer lain.
3. **Integritas Firestore:** Data ditulis ke koleksi Firestore yang tepat dengan `serverTimestamp` dan atribut audit yang lengkap.
4. **Tidak Ada Konflik Hak Akses:** Security Rules menolak operasi presensi dari luar radius atau tanpa koordinat, serta menolak modifikasi laboratorium oleh peran selain asisten.
5. **Kebersihan Kode & Pembersihan Listener:** Seluruh listener Firestore (`onSnapshot`) dan geolokasi (`Location.watchPositionAsync`) dibersihkan (*clean up on unmount*) guna mencegah kebocoran memori.
6. **Bebas Error Statik:** Proyek berhasil melewati `npx expo lint` dan `npx tsc --noEmit` dengan 0 pesan kesalahan.
7. **Verifikasi Demo:** Modul berhasil didemonstrasikan dalam 3 skenario utama di hadapan PM.

---

## 8. Ringkasan Eksekutif

```text
================================================================================================
STRUKTUR TIM SPRINT 3 — SISTEM MANAJEMEN PRAKTIKUM
================================================================================================
Galang (PM)  --> Manajemen Proyek, Kontrak Antarmuka, Lingkungan Expo/Firebase, 
                 Review Integrasi, Acceptance & Skenario Demo (Non-Coding)

Abhi         --> Domain Peta & Aktivitas Laboratorium:
                 - Master Data Laboratorium (Firestore CRUD & Radius)
                 - Peta Interaktif Laboratorium (Custom Markers & Controls)
                 - Live User Location Tracking (Dynamic GPS Marker)
                 - Bottom Sheet Aktivitas Lab Real-Time (Active & Next Session)
                 - Penanganan Izin Lokasi pada Modul Peta

Al           --> Domain Presensi Lokasi & Push Notification:
                 - Halaman Presensi Mandiri (Terpisah dari Detail Sesi)
                 - Mesin Validasi Geofencing (Formula Haversine & Status Radius)
                 - Pencatatan Presensi dengan Audit Lokasi di Firestore
                 - Registrasi & Sinkronisasi Push Token Perangkat
                 - Mesin Push Notification (4 Event Pemicu: Buka Sesi, Jadwal, Izin)
                 - Notifikasi Foreground/Background & Deep Linking Navigasi
================================================================================================
```

---

## 9. Referensi Implementasi untuk Programmer

Tabel berikut menjadi panduan teknis implementasi bagi Abhi dan Al sesuai referensi resmi materi:

| Topik / Kebutuhan | Penerapan dalam Proyek | Panduan Resmi & Referensi Materi |
|---|---|---|
| **Rich Push Notifications** | Konfigurasi push notification handler, background notification listener, token management, dan payload rich data. | [Rich Push Notifications in React Native Guide](https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366) |
| **Google Maps & Tracking** | Integrasi peta, perenderan custom marker laboratorium, dan pelacakan posisi pengguna secara dinamis. | [Implementing Google Maps & Routes Tracking in React Native](https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8) |
| **Expo Location SDK 58** | Penggunaan `requestForegroundPermissionsAsync()`, `getCurrentPositionAsync()`, dan `watchPositionAsync()`. | [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/) |
| **Expo Notifications SDK 58** | Penggunaan `getExpoPushTokenAsync()`, `setNotificationHandler()`, dan listener interaksi notifikasi. | [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| **React Native Maps** | Komponen `MapView`, `Marker`, dan penanganan event `onPress` untuk menampilkan bottom sheet aktivitas. | [Expo MapView Documentation](https://docs.expo.dev/versions/latest/sdk/map-view/) |
| **Formula Haversine** | Algoritma perhitungan jarak antar-koordinat desimal dalam satuan meter. | Formula matematika WGS 84 pada Bagian 9 SRS Sprint 3 |
| **Firebase Cloud Messaging** | Integrasi FCM token dan mekanisme trigger via HTTP v1 atau Cloud Firestore listener. | [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging) |
