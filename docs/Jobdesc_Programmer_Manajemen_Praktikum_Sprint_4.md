# Sistem Manajemen Praktikum — Jobdesc Programmer Sprint 4

## 1. Tujuan Pembagian dan Susunan Tim

Sprint 4 merupakan tahap konsolidasi aplikasi React Native dengan memperkenalkan peran **Asisten Laboratorium (Aslab)**, **Dashboard Keberlangsungan Laboratorium**, **Pengelolaan Sesi Asprak**, **Sistem Denda Keterlambatan (Grace Period)**, **Integrasi Payment Gateway Midtrans Sandbox**, **Notifikasi & Riwayat Pembayaran**, **Integrasi Analisis Sentimen AI pada Pengajuan Izin**, serta **Finalisasi Antarmuka (UI/UX)** yang modern dan konsisten.

Tim terdiri dari **3 orang** dengan prinsip pembagian tugas **adil (*fair & balanced workload*)** dan **bebas ketergantungan (*zero blocking dependency*)**:
- **Galang** sebagai **Project Manager (PM)** bertugas mengendalikan *scope*, menyusun kontrak data TypeScript global (`sprint4-contracts.ts`), menyiapkan token desain UI bersama (`theme.ts`), menyiapkan lingkungan Midtrans Sandbox & AI API, melakukan *integration review*, dan mengorkestrasi skenario demo **tanpa menulis kode fitur**.
- Implementasi teknis dibagi secara vertikal (*vertical slice*) secara seimbang kepada dua programmer dengan jumlah beban fungsional tepat sama (**9 FR vs 9 FR**):

| Anggota | Peran | Tanggung Jawab & Domain Mandiri |
|---|---|---|
| **Galang** | **Project Manager (PM)** | Pengendalian *scope*, perumusan kontrak data TypeScript, penyiapan tema UI standar, penyediaan kredensial Midtrans Sandbox & AI API, peninjauan integrasi (*integration review*), validasi Security Rules, dan orkestrasi 3 skenario demo. **Tidak mengimplementasikan kode fitur.** |
| **Abhi** | **Programmer: Aslab Management, Bulk Engine, Asprak Session, & AI Leave** | Pengelolaan master laboratorium (CRUD `labs`, radius, grace period), 3 modul Bulk/Single Insert terpisah (Lab per Matkul, Praktikan, Asprak) lengkap dengan *downloadable template*, antarmuka *Scroll View Review & Inline Editor*, pemindahan praktikan/asprak/aslab antar-lab, pengelolaan sesi kelas oleh Asprak (buka/pantau presensi/tutup sesi), pengajuan izin praktikan dengan analisis sentimen AI beserta mekanisme *graceful degradation*, layar tinjauan izin Asprak dengan AI support (*excused absence*), serta finalisasi UI modul terkait. |
| **Al** | **Programmer: Dashboard Monitoring, Fines Engine, Midtrans Payment, & Notifications** | Dashboard Keberlangsungan Laboratorium (metrik lab/praktikan, status lab, lokasi & waktu, jadwal *ongoing/upcoming*, riwayat kegiatan, filter hari/minggu/bulan, & rekap keuangan denda), mesin evaluasi keterlambatan (*grace period*), penerbitan tagihan denda idempoten & pembebasan denda (*fine waiver*), arsitektur aman *Client–Server–Payment Gateway* Midtrans Sandbox (pembuatan Snap Token di backend, Checkout Snap Webview, verifikasi *Webhook/Callback*, status `pending`/`success`/`failed`), layar riwayat pembayaran persisten, push notification denda & pembayaran, serta finalisasi UI modul terkait. |

---

## 2. Pembagian SRS / Fitur (User Story Format)

**Galang - PM :** Sebagai Project Manager, saya merumuskan kontrak data TypeScript, menyiapkan standar desain UI konsisten, mengonfigurasi kredensial Midtrans Sandbox & API AI, memverifikasi integrasi bebas konflik, dan memimpin pengujian 3 alur demo akhir tanpa mengambil kodingan fitur.

**Abhi - FR-01 :** Sebagai Aslab, saya dapat menambah, melihat, mengubah, dan mengelola data master laboratorium termasuk nama, lokasi, koordinat, cakupan radius validasi presensi, serta batasan toleransi keterlambatan (*grace period*).

**Abhi - FR-02 :** Sebagai Aslab, saya dapat mengunduh berkas template khusus dan melakukan *bulk* atau *single insert* untuk membuat sejumlah laboratorium sekaligus berdasarkan satu mata kuliah.

**Abhi - FR-03 :** Sebagai Aslab, saya dapat mengunduh berkas template khusus dan melakukan *bulk* atau *single insert* data praktikan ke dalam laboratorium tertentu secara terpisah.

**Abhi - FR-04 :** Sebagai Aslab, saya dapat mengunduh berkas template khusus dan melakukan *bulk* atau *single insert* data Asprak ke dalam laboratorium tertentu secara terpisah.

**Abhi - FR-05 :** Sebagai Aslab yang mengunggah data bulk, saya dapat meninjau setiap baris data dalam daftar *scroll view* yang fleksibel untuk menerima (*accept*), menolak (*deny*), maupun menyunting dan melengkapi data yang masih kosong secara langsung sebelum disimpan ke Firestore.

**Abhi - FR-06 :** Sebagai Aslab, saya dapat memindahkan praktikan serta penugasan asprak/aslab dari satu laboratorium ke laboratorium lainnya tanpa memindahkan jadwal praktikum kelas induk.

**Abhi - FR-07 :** Sebagai Asprak, saya dapat melihat daftar kelas, jadwal, dan sesi tanggung jawab saya, membuka sesi praktikum, memantau serta mengelola presensi praktikan secara real-time, dan menutup sesi setelah praktikum selesai tanpa memiliki kewenangan konfigurasi seluruh lab atau distribusi praktikan.

**Abhi - FR-08 :** Sebagai Praktikan, saya dapat mengajukan izin pada sesi praktikum tertentu dengan alasan ketidakhadiran yang dianalisis sentimennya via API model AI dan disimpan di Cloud Firestore, dengan mekanisme *graceful degradation* agar proses pengajuan tidak terhambat saat layanan AI mengalami gangguan.

**Abhi - FR-09 :** Sebagai Asprak, saya dapat memantau daftar izin praktikan tanggung jawab saya beserta hasil analisis AI sebagai informasi pendukung untuk menerima atau menolak izin secara real-time, di mana izin yang disetujui mencatat status *excused absence* (tanpa mengubah kehadiran menjadi hadir).

**Al - FR-10 :** Sebagai Aslab, saya dapat memantau Dashboard Keberlangsungan Laboratorium yang menampilkan jumlah laboratorium, jumlah praktikan, status kegiatan setiap lab, informasi lokasi dan waktu pelaksanaan, jadwal praktikum yang sedang berlangsung dan akan datang, serta riwayat kegiatan laboratorium secara real-time dari Firebase.

**Al - FR-11 :** Sebagai Aslab, saya dapat memfilter tampilan riwayat kegiatan laboratorium dan riwayat keuangan hasil denda praktikum pada Dashboard berdasarkan rentang hari, minggu, dan bulan.

**Al - FR-12 :** Sebagai sistem, saya mengevaluasi waktu presensi praktikan terhadap waktu mulai sesi dan *grace period* terkonfigurasi untuk menentukan apakah praktikan berstatus tepat waktu (`on_time`) atau terlambat (`late`).

**Al - FR-13 :** Sebagai sistem, saya secara otomatis membuat tepat satu tagihan denda nominal tetap per kejadian keterlambatan yang terhubung dengan identitas praktikan, sesi, dan presensi, di mana pelunasan tagihan tidak mengubah status kehadiran praktikan dan denda otomatis dibebaskan apabila izin praktikan disetujui (*excused absence*).

**Al - FR-14 :** Sebagai sistem backend, saya membuat transaksi pembayaran Midtrans Sandbox melalui arsitektur *client–server–payment gateway* yang aman tanpa menyimpan *secret key* di aplikasi mobile dan mengembalikan Snap Token ke aplikasi praktikan.

**Al - FR-15 :** Sebagai sistem backend, saya menerima dan memverifikasi callback/webhook resmi dari Midtrans Sandbox untuk memperbarui status tagihan dan transaksi menjadi `pending`, `success`, atau `failed` secara sah.

**Al - FR-16 :** Sebagai Praktikan yang memiliki tagihan denda, saya dapat melihat daftar tagihan beserta rincian nominal denda dan diarahkan ke halaman/metode pembayaran Midtrans Snap untuk menyelesaikan transaksi.

**Al - FR-17 :** Sebagai Praktikan, saya dapat mengakses halaman riwayat pembayaran yang menampilkan informasi sesi, tanggal tagihan, nominal, waktu transaksi, dan status pembayaran secara persisten meskipun aplikasi ditutup dan dibuka kembali.

**Al - FR-18 :** Sebagai Praktikan, saya menerima *push notification* secara real-time ketika tagihan denda baru dibuat, ketika pembayaran berhasil diverifikasi, dan ketika pembayaran gagal atau memerlukan penyelesaian lebih lanjut.

### 2.1 Rincian Task Programmer (Internal Tasks)

#### Galang — Project Manager (Non-Coding)
- **GA-01 — Scope & Backlog Enforcement:** Menjaga keselarasan pengembangan seluruh fitur dengan 18 kebutuhan fungsional dan kriteria penerimaan pada SRS Sprint 4.
- **GA-02 — Contract & UI Token Kickoff:** Mempublikasikan kontrak tipe global `src/types/sprint4-contracts.ts` serta panduan gaya dan token tema konsisten (`src/constants/theme.ts`) sebelum implementasi fitur dimulai.
- **GA-03 — Sandbox & Environment Setup:** Mengonfigurasi akun Midtrans Sandbox (Merchant ID, Client Key, Server Key untuk backend), kunci API model AI dari pengajar, serta variabel lingkungan (`.env.example`).
- **GA-04 — Integration Review & Security Rules Audit:** Memeriksa batas kepemilikan berkas (*zero file overlap*), meninjau aturan akses role `aslab`/`asprak`/`student` pada `firestore.rules`, serta menjalankan validasi `npx expo lint` dan `npx tsc --noEmit`.
- **GA-05 — End-to-End Acceptance & Demo Orchestration:** Memimpin uji coba skenario demonstrasi akhir bersama penguji untuk memastikan seluruh fitur berjalan stabil tanpa regresi.

#### Abhi — Programmer Aslab Management, Bulk Engine, Asprak Session, & AI Leave
- **AB-01 — Master Data Laboratorium & Konfigurasi (FR-01):** Mengimplementasikan CRUD koleksi `labs/{labId}` mencakup informasi gedung, koordinat peta, radius geofencing, durasi *grace period* default, dan nominal denda default.
- **AB-02 — Downloadable Template Generators (FR-02, FR-03, FR-04):** Membangun utilitas penghasil dan pengunduh berkas template CSV/JSON yang terpisah secara independen untuk tiga entitas: (1) Lab berdasarkan mata kuliah, (2) Praktikan per lab, dan (3) Asprak per lab.
- **AB-03 — Bulk & Single Insert Parsers (FR-02, FR-03, FR-04):** Mengimplementasikan pemilih berkas (`expo-document-picker`) dan *parser* validasi skema untuk ketiga tipe berkas bulk insert serta form *single insert* konvensional.
- **AB-04 — Interactive Scroll View Review & Inline Editor (FR-05):** Mengembangkan antarmuka peninjauan berbasis kartu gulir (*ScrollView/FlatList*) yang menampilkan setiap baris data hasil parsing dengan tombol aksi Terima (*Accept*), Tolak (*Deny*), serta kolom input *inline* untuk melengkapi/mengubah field yang kosong sebelum *batch write* ke Firestore.
- **AB-05 — Lab Member Reassignment Manager (FR-06):** Membuat modul pemindahan praktikan dan penugasan asprak/aslab antar-laboratorium tanpa mengubah jadwal sesi praktikum.
- **AB-06 — Asprak Session Operations Screen (FR-07):** Mengembangkan halaman khusus Asprak untuk melihat daftar kelas/jadwal tanggung jawabnya, membuka sesi praktikum, memantau & mengelola daftar hadir praktikan secara real-time, serta menutup sesi (dengan pembatasan akses RBAC).
- **AB-07 — AI Sentiment Analysis Service & Fallback Handler (FR-08):** Mengintegrasikan API model AI dari pengajar untuk menganalisis sentimen teks alasan izin praktikan, menyimpannya ke `leaveRequests`, serta menerapkan *timeout & fallback* agar pengajuan izin tetap berjalan meski AI mengalami gangguan.
- **AB-08 — Asprak AI Leave Review & Excused Status UI (FR-09):** Mengembangkan antarmuka peninjauan izin bagi Asprak yang menampilkan alasan izin dan badge rekomendasi sentimen AI sebagai informasi pendukung, memproses keputusan terima/tolak secara real-time ke praktikan, dan menetapkan status presensi `excused`.
- **AB-09 — UI/UX Finalization (Domain Aslab, Asprak, & AI Leave):** Memastikan tampilan modern, responsif, konsisten dengan *theme tokens*, serta dilengkapi *loading/empty/error states*.
- **AB-10 — Lab, Session, & Leave Security Rules & Domain QA:** Menyusun fragmen `firestore.rules` untuk koleksi `labs`, `sessions`, dan `leaveRequests`, serta menguji alur bulk insert, sesi Asprak, dan AI fallback secara menyeluruh.

#### Al — Programmer Dashboard Monitoring, Fines Engine, Midtrans Payment, & Notifications
- **AL-01 — Aslab Monitoring Dashboard UI (FR-10):** Mengembangkan layar dashboard real-time untuk Aslab yang menampilkan statistik jumlah lab dan praktikan, status kegiatan setiap lab, info lokasi/waktu, daftar jadwal berlangsung (*ongoing*) dan mendatang (*upcoming*), serta riwayat kegiatan laboratorium dari Firebase.
- **AL-02 — Dashboard Time Filtering & Financial Summary (FR-11):** Mengimplementasikan filter rentang waktu (Hari, Minggu, Bulan) pada Dashboard untuk menyaring riwayat kegiatan laboratorium dan merangkum riwayat serta total penerimaan keuangan denda praktikum dari koleksi `fines` dan `paymentTransactions`.
- **AL-03 — Grace Period & Lateness Evaluation Engine (FR-12):** Mengimplementasikan fungsi kalkulasi keterlambatan berdasarkan perbandingan `attendedAt` dengan `openedAt + gracePeriodMinutes` untuk menentukan status `on_time` vs `late`.
- **AL-04 — Idempotent Fine Billing & Waiver Service (FR-13):** Membuat mekanisme penerbitan tagihan denda nominal tetap dengan ID deterministik `fine_{sessionId}_{studentId}` yang terhubung dengan identitas praktikan, sesi, dan presensi, menjaga status kehadiran tetap `late` saat lunas, serta otomatis membebaskan/membatalkan denda (`waived`) ketika pengajuan izin berstatus `approved` / `excused`.
- **AL-05 — Backend Midtrans Sandbox Service & Snap Token (FR-14):** Membangun endpoint backend/Cloud Function untuk membuat transaksi Midtrans Sandbox menggunakan Server Key dan mengembalikan `snapToken` serta `redirectUrl` ke aplikasi React Native secara aman.
- **AL-06 — Midtrans Webhook Callback & Verification (FR-15):** Mengimplementasikan endpoint HTTP Webhook di backend untuk menerima notifikasi Midtrans, memvalidasi `signature_key`, dan memperbarui status tagihan (`pending`, `success`/`paid`, `failed`) secara idempoten.
- **AL-07 — Student Fine Checkout & Snap Webview UI (FR-16):** Membangun halaman daftar tagihan denda praktikan, rincian nominal, integrasi Snap Payment Webview/Redirect, serta tampilan status proses pembayaran.
- **AL-08 — Persistent Payment History Screen (FR-17):** Mengembangkan halaman riwayat pembayaran praktikan yang menampilkan informasi sesi, tanggal tagihan, nominal, waktu transaksi, dan status pembayaran dengan dukungan persistensi offline/Firestore agar tetap ada saat aplikasi ditutup dan dibuka ulang.
- **AL-09 — Payment & Fine Push Notification Triggers (FR-18):** Mengintegrasikan layanan notifikasi untuk mengirim *push notification* saat tagihan denda baru terbit (`FINE_ISSUED`), pembayaran sukses (`PAYMENT_SUCCESS`), dan pembayaran gagal (`PAYMENT_FAILED`).
- **AL-10 — UI/UX Finalization (Domain Dashboard & Payment) & Domain QA:** Menyelaraskan desain modern seluruh layar Dashboard, tagihan, dan riwayat pembayaran dengan *theme tokens*, melengkapi `firestore.rules` koleksi `fines` dan `paymentTransactions`, serta menguji alur Dashboard filter & Midtrans Sandbox.

---

## 3. Kontrak Awal untuk Kerja Paralel

Untuk menjamin **zero blocking dependency**, seluruh struktur data lintas-domain didefinisikan oleh Galang (PM) pada berkas kontrak global sebelum Abhi dan Al menulis kode fitur:

```ts
// src/types/sprint4-contracts.ts

export type UserRole = 'student' | 'asprak' | 'aslab';

export type LabConfig = {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  defaultGracePeriodMinutes: number;
  defaultFineAmount: number;
  isActive: boolean;
  managedBy: string;
};

export type BulkInsertType = 'lab' | 'student' | 'asprak';

export type BulkReviewStatus = 'pending' | 'accepted' | 'denied';

export interface BulkRowItem<T = Record<string, string | number>> {
  rowId: string;
  rawIndex: number;
  data: T;
  missingFields: string[];
  validationError: string | null;
  reviewStatus: BulkReviewStatus;
}

export type SessionRecord = {
  sessionId: string;
  classId: string;
  labId: string;
  title: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  gracePeriodMinutes: number;
  fineAmount: number;
  startsAt: string;
  endsAt: string;
  openedAt?: string | null;
  closedAt?: string | null;
  status: 'scheduled' | 'open' | 'closed';
  openedBy?: string | null;
};

export type AttendanceStatus = 'on_time' | 'late' | 'excused' | 'absent';

export type AttendanceRecordV4 = {
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  attendedAt: string;
  attendanceStatus: AttendanceStatus;
  minutesLate: number;
  fineId?: string | null;
};

export type FineStatus = 'unpaid' | 'pending' | 'paid' | 'waived' | 'failed';

export type FineRecord = {
  id: string; // fine_{sessionId}_{studentId}
  sessionId: string;
  sessionTitle: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  attendanceId: string;
  amount: number;
  minutesLate: number;
  status: FineStatus;
  issuedAt: string;
  paidAt?: string | null;
  transactionId?: string | null;
  isWaived: boolean;
  waiveReason?: string | null;
};

export type PaymentTransactionStatus = 'pending' | 'success' | 'failed';

export type PaymentTransaction = {
  orderId: string;
  fineId: string;
  studentId: string;
  sessionTitle: string;
  grossAmount: number;
  paymentType?: string | null;
  transactionStatus: PaymentTransactionStatus;
  snapToken: string;
  redirectUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AIAnalysisStatus = 'completed' | 'fallback_manual_review';

export type AIAnalysisResult = {
  status: AIAnalysisStatus;
  sentiment: 'urgent_medical' | 'urgent_family' | 'academic' | 'neutral' | 'weak_reason' | null;
  confidenceScore: number | null;
  summary: string;
  recommendation: 'recommend_approval' | 'needs_verification' | 'manual_review';
};

export type LeaveRequestV4 = {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  reason: string;
  documentUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  aiAnalysis: AIAnalysisResult;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
};

export type Sprint4NotificationType =
  | 'FINE_ISSUED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED';
```

### Aturan Kontrak (Penghilang Dependensi):
1. **Unifikasi Domain Asprak di Abhi & Domain Keuangan/Dashboard di Al:**
   - Abhi mengelola penuh seluruh interaksi operasional Asprak (buka/tutup sesi, pantau presensi, dan tinjauan izin berbantuan AI) tanpa ada layar Asprak yang terbelah ke programmer lain.
   - Al mengelola penuh seluruh aliran keuangan (kalkulasi denda, pembayaran Midtrans, riwayat transaksi, dan Dashboard keuangan denda), sehingga Dashboard keuangan langsung membaca data dari koleksi yang dikelolanya sendiri.
2. **Isolasi Data Sesi & Dashboard:** Abhi menulis data `labs/{labId}` dan `sessions/{sessionId}` sesuai kontrak `LabConfig` dan `SessionRecord`. Al membaca skema koleksi tersebut untuk Dashboard dan kalkulasi `gracePeriod`. Selama pengembangan paralel, Al menggunakan *mock/seed fixture* `labs` dan `sessions` yang sesuai kontrak tanpa perlu menunggu modul Abhi selesai.
3. **Isolasi Status Izin & Pembebasan Denda:** Ketika Asprak menyetujui izin di modul Abhi, Abhi memperbarui `leaveRequests/{id}.status = 'approved'` serta mencatat `attendanceStatus = 'excused'`. Mesin Denda Al membaca status `excused`/`approved` tersebut dari kontrak untuk membebaskan/membatalkan tagihan denda (`status: 'waived'`) tanpa Abhi perlu memanggil kode logika denda milik Al.
4. **Tema Desain Terpusat:** Galang menyediakan `src/constants/theme.ts` berisi palet warna, tipografi, dan komponen radius/spacing standar pada awal sprint agar hasil akhir UI kedua programmer seragam tanpa saling tumpang tindih file.

---

## 4. Rincian Pekerjaan dan Matriks Traceability (Zero Dependency)

| Kode FR SRS | Deskripsi Kebutuhan | Owner Tunggal | Task Internal | Lingkup / Modul |
|---|---|:---:|---|---|
| **FR-01** | Master Lab & Konfigurasi (Radius/Grace Period) | **Abhi** | `AB-01`, `AB-10` | Lab Management Feature & `labs` CRUD |
| **FR-02** | Bulk/Single Insert Lab per Mata Kuliah + Template | **Abhi** | `AB-02`, `AB-03` | Course-Lab Template & Bulk Parser |
| **FR-03** | Bulk/Single Insert Praktikan ke Lab + Template | **Abhi** | `AB-02`, `AB-03` | Student Template & Bulk Parser |
| **FR-04** | Bulk/Single Insert Asprak ke Lab + Template | **Abhi** | `AB-02`, `AB-03` | Asprak Template & Bulk Parser |
| **FR-05** | Interactive Scroll View Review & Inline Editor | **Abhi** | `AB-04` | Bulk Review UI (Accept/Deny/Inline Edit) |
| **FR-06** | Distribusi & Pemindahan Anggota Lab | **Abhi** | `AB-05` | Member Reassignment Service (No Schedule Move) |
| **FR-07** | Pengelolaan Sesi Kelas oleh Asprak | **Abhi** | `AB-06`, `AB-09` | Asprak Session Screen (Open/Live/Close) |
| **FR-08** | Pengajuan Izin, Sentimen AI, & Fallback | **Abhi** | `AB-07`, `AB-09` | Leave Form, AI Sentiment API, & Graceful Degradation |
| **FR-09** | Tinjauan Izin AI Asprak (*Excused Absence*) | **Abhi** | `AB-08`, `AB-10` | Asprak AI Decision Support & Excused Status |
| **FR-10** | Dashboard Monitoring Keberlangsungan Lab | **Al** | `AL-01`, `AL-10` | Aslab Dashboard UI, Metrics, Ongoing/Upcoming, & Logs |
| **FR-11** | Filter Periode Dashboard & Keuangan Denda | **Al** | `AL-02` | Day/Week/Month Filter & Financial Summary |
| **FR-12** | Evaluasi Keterlambatan & Grace Period | **Al** | `AL-03` | Timing Evaluator (`on_time` vs `late`) |
| **FR-13** | Tagihan Denda Idempoten & Pembebasan Denda | **Al** | `AL-04`, `AL-10` | Fine Generator, `fines` Service, & Fine Waiver |
| **FR-14** | Integrasi Midtrans Client-Server & Snap Token | **Al** | `AL-05` | Backend Snap Generator & Server Key Isolation |
| **FR-15** | Verifikasi Webhook Callback Midtrans & Status | **Al** | `AL-06` | Server Webhook Handler & Signature Verification |
| **FR-16** | Antarmuka Pembayaran Tagihan (Snap Checkout) | **Al** | `AL-07`, `AL-10` | Student Billing List & Midtrans Snap Webview |
| **FR-17** | Halaman Riwayat Pembayaran Praktikan Persisten | **Al** | `AL-08` | Persistent Payment History Screen & Log |
| **FR-18** | Sistem Notifikasi Denda & Pembayaran | **Al** | `AL-09` | Push Trigger (Fine Issued, Success, Failed) |

**Total Distribusi Beban Kerja:**
- **Abhi:** 9 FR (`FR-01` s.d. `FR-09`) — 100% Fokus di Ekosistem Manajemen Laboratorium, Bulk Engine, Operasional Sesi Asprak, serta Integrasi AI & Pengajuan Izin.
- **Al:** 9 FR (`FR-10` s.d. `FR-18`) — 100% Fokus di Ekosistem Dashboard Monitoring, Evaluasi Grace Period, Denda, Payment Gateway Midtrans, Riwayat Pembayaran, & Notifikasi Keuangan.
- **Galang (PM):** 0 Fitur Kodingan — Tata Kelola Arsitektur, Kontrak TypeScript, UI Theme Tokens, Setup Midtrans/AI, Integration Review, & Acceptance Demo.

---

## 5. Cara Kerja Paralel dan Siklus Pengembangan

```mermaid
flowchart TD
    subgraph Tahap 1: Inisiasi & Kontrak
        PM1["Galang (PM): Publikasi sprint4-contracts.ts, theme.ts, & Setup Env Midtrans/AI"]
    end

    subgraph Tahap 2: Pengerjaan Paralel Mandiri (Zero Blocking)
        subgraph Jalur Abhi (Lab, Bulk Engine, Sesi Asprak & AI Leave)
            AB1["AB-01: CRUD Master Lab & Konfigurasi Radius/Grace Period"] --> AB2["AB-02/03: 3 Template Generator & Bulk Parsers"]
            AB2 --> AB3["AB-04: Interactive Scroll View Review & Inline Editor"]
            AB3 --> AB4["AB-05: Pemindahan Praktikan/Asprak/Aslab Antar-Lab"]
            AB4 --> AB5["AB-06: Operasional Sesi Asprak (Buka/Monitor/Tutup)"]
            AB5 --> AB6["AB-07/08: AI Sentimen Izin + Fallback & Review Izin Asprak"]
            AB6 --> AB7["AB-09/10: UI Polish Domain Abhi & Rules Lab/Session/Leave"]
        end

        subgraph Jalur Al (Dashboard, Denda, Midtrans & Notifikasi)
            AL1["AL-01/02: Dashboard Aslab (Metrik, Jadwal, Filter Hari/Minggu/Bulan, Kas Denda)"] --> AL2["AL-03/04: Mesin Grace Period, Tagihan Idempoten, & Fine Waiver"]
            AL2 --> AL3["AL-05/06: Backend Midtrans Snap Token & Webhook Verifier"]
            AL3 --> AL4["AL-07/08: Checkout Snap Webview & Riwayat Pembayaran Persisten"]
            AL4 --> AL5["AL-09: Push Notification Tagihan Baru, Sukses, & Gagal"]
            AL5 --> AL6["AL-10: UI Polish Domain Al & Rules Fines/Transactions"]
        end
    end

    subgraph Tahap 3: Integrasi Antarmodul
        INT1["Penyambungan Data Lab & Sesi: Dashboard & Fine Engine (Al) membaca koleksi labs/sessions (Abhi)"]
        INT2["Penyambungan Fine Waiver: Fine Engine (Al) membebaskan denda saat leaveRequests (Abhi) berstatus approved"]
        INT3["Penyatuan Navigasi UI: PM menautkan rute fitur Aslab, Asprak, & Praktikan pada menu aplikasi"]
    end

    subgraph Tahap 4: Review, Pengujian, & Demo
        PM2["Galang (PM): Audit Security Rules, npx expo lint, npx tsc --noEmit, & 3 Skenario Demo"]
    end

    Tahap 1 --> Tahap 2
    Tahap 2 --> Tahap 3
    Tahap 3 --> Tahap 4
```

1. **Langkah 1 (Kontrak & Environment Awal):** Galang menerbitkan `src/types/sprint4-contracts.ts` dan `src/constants/theme.ts`, serta memastikan kredensial Midtrans Sandbox dan kunci API AI siap di lingkungan backend/development.
2. **Langkah 2 (Implementasi Paralel Independen):**
   - **Abhi** membangun seluruh antarmuka dan service pada folder `src/features/aslab/`, `src/features/bulk_insert/`, `src/features/asprak_session/`, `src/features/leave_ai/`, `src/services/ai/`, serta rute `src/app/aslab/`, `src/app/asprak/`, dan `src/app/leave/`.
   - **Al** membangun seluruh antarmuka dan engine pada folder `src/features/dashboard/`, `src/features/fines/`, `src/features/payments/`, `src/services/midtrans/`, layanan backend `server/midtrans/` (atau `functions/`), serta rute `src/app/(tabs)/dashboard.tsx` dan `src/app/payments/`. Pengujian Dashboard & Grace Period memakai *mock/seed* dokumen `labs` dan `sessions` sesuai kontrak.
3. **Langkah 3 (Integrasi Tanpa Konflik):**
   - Menghubungkan data real-time koleksi `labs` dan `sessions` dari modul Abhi ke Dashboard dan kalkulator keterlambatan modul Al.
   - Memverifikasi *Fine Waiver* modul Al membebaskan denda ketika pengajuan izin di modul Abhi disetujui Asprak (`excused`).
   - Galang merapikan tautan navigasi peran (`aslab`, `asprak`, `student`) pada router utama aplikasi.
4. **Langkah 4 (QA & Acceptance Demo):** Galang memverifikasi tidak ada *merge conflict*, memastikan `npx expo lint` serta `npx tsc --noEmit` lulus bersih, lalu mendemonstrasikan 3 skenario utama Sprint 4.

---

## 6. Kepemilikan Berkas (*File Ownership & No-Overlap*)

Untuk memastikan **0% konflik penggabungan (*zero merge conflict*)**, setiap berkas dan direktori hanya dikelola oleh satu penanggung jawab tunggal:

| Jalur Berkas / Direktori | Penanggung Jawab | Keterangan |
|---|:---:|---|
| `docs/SRS_Manajemen_Praktikum_Sprint_4.md` | Galang (PM) | Dokumen SRS resmi Sprint 4 |
| `docs/Jobdesc_Programmer_Manajemen_Praktikum_Sprint_4.md` | Galang (PM) | Dokumen pembagian tugas tim Sprint 4 |
| `src/types/sprint4-contracts.ts` | Galang (PM) | Kontrak data TypeScript lintas modul |
| `src/constants/theme.ts` | Galang (PM) | Token desain UI global (warna, spacing, tipografi) |
| `app.json`, `.env.example` | Galang (PM) | Konfigurasi environment & app navigation root |
| `src/app/aslab/*` | Abhi | Rute manajemen lab, bulk insert, & pemindahan anggota |
| `src/app/asprak/*` | Abhi | Rute operasional sesi Asprak & tinjauan izin AI Asprak |
| `src/app/leave/*` | Abhi | Rute pengajuan & status izin praktikan berbasis AI |
| `src/features/aslab/*` | Abhi | Service CRUD lab, radius, grace period, & transfer anggota |
| `src/features/bulk_insert/*` | Abhi | Komponen Scroll View Review Editor & 3 parser bulk insert |
| `src/features/asprak_session/*` | Abhi | Service buka/tutup sesi & real-time monitor presensi |
| `src/features/leave_ai/*` | Abhi | Form izin, kartu sentimen AI, & status *excused absence* |
| `src/services/ai/*` | Abhi | Integrasi API model AI & fallback *graceful degradation* |
| `src/utils/template-generators.ts` | Abhi | Utilitas pembuat & pengunduh 3 berkas template CSV/JSON |
| `firestore.rules` (Fragmen `labs`, `sessions`, `leaveRequests`) | Abhi | Aturan akses RBAC untuk lab, sesi, dan pengajuan izin |
| `src/app/(tabs)/dashboard.tsx` | Al | Layar utama Dashboard Keberlangsungan Lab |
| `src/app/payments/*` | Al | Rute daftar tagihan denda, Snap checkout, & riwayat bayar |
| `src/features/dashboard/*` | Al | Komponen statistik lab, jadwal, filter hari/minggu/bulan, & kas |
| `src/features/fines/*` | Al | Evaluator *grace period*, generator denda, & *fine waiver* |
| `src/features/payments/*` | Al | Antarmuka Midtrans Snap Webview & riwayat transaksi persisten |
| `src/services/midtrans/*` | Al | Klien transaksi pembayaran & sinkronisasi status tagihan |
| `src/services/notification/payment-notifications.ts` | Al | Dispatcher push notification denda & hasil pembayaran |
| `server/midtrans/*` atau `functions/*` | Al | Endpoint backend pembuat Snap Token & verifikator Webhook |
| `firestore.rules` (Fragmen `fines`, `paymentTransactions`) | Al | Aturan keamanan data finansial denda & transaksi Midtrans |

---

## 7. Kriteria Penyelesaian (*Definition of Done*)

Sebuah fitur pada Sprint 4 dinyatakan selesai (*Done*) apabila memenuhi seluruh poin berikut:

1. **Kepatuhan Kontrak & Fungsional:** Seluruh logika bisnis dan acceptance criteria pada FR terkait berfungsi 100%, termasuk kasus tepi (*bulk row edit/deny*, *AI timeout fallback*, *grace period boundary*, dan *Midtrans webhook failure*).
2. **Keamanan Pembayaran Mutlak:** Tidak ada Server Key Midtrans di dalam kode klien React Native. Status pembayaran lunas (`paid`) hanya terjadi setelah verifikasi signature webhook di backend.
3. **Kemandirian & Isolasi Kode:** Modul milik Abhi dan Al dapat dijalankan secara terpisah menggunakan kontrak `sprint4-contracts.ts` tanpa error kompilasi maupun konflik berkas.
4. **Kualitas Antarmuka (UI Polish):** Seluruh layar mengikuti standar `theme.ts`, responsif di berbagai ukuran layar mobile, serta memiliki *loading*, *empty*, dan *error state* yang jelas.
5. **Persistensi & Kebersihan Listener:** Riwayat transaksi persisten saat aplikasi dimulai ulang, dan seluruh listener Firestore (`onSnapshot`) dibersihkan saat komponen *unmount*.
6. **Bebas Error Statik:** Proyek lolos `npx expo lint` dan `npx tsc --noEmit` dengan nol galat.
7. **Demonstrasi End-to-End:** Seluruh fitur terintegrasi dan sukses didemonstrasikan dalam 3 skenario utama di hadapan PM.

---

## 8. Ringkasan Eksekutif

```text
====================================================================================================
STRUKTUR TIM SPRINT 4 — SISTEM MANAJEMEN PRAKTIKUM (ZERO DEPENDENCY & PEMBAGIAN ADIL)
====================================================================================================
Galang (PM)  --> Tata Kelola Ruang Lingkup, Kontrak Global (sprint4-contracts.ts), Tema UI Terpadu
                 (theme.ts), Setup Midtrans Sandbox & AI API, Security Rules Review, Demo QA (Non-Coding)

Abhi (9 FR)  --> Domain Aslab Management, Bulk Engine, Operasional Sesi Asprak, & AI Leave:
                 - Master Data Laboratorium (CRUD, Koordinat, Radius Geofencing, Grace Period)
                 - 3 Modul Bulk & Single Insert Terpisah + Downloadable Template (Lab, Praktikan, Asprak)
                 - Interactive Scroll View Review & Inline Editor (Accept / Deny / Isi Data Kosong)
                 - Pemindahan Praktikan & Asprak/Aslab Antar-Laboratorium (Tanpa Ubah Jadwal)
                 - Pengelolaan Sesi oleh Asprak (Buka Sesi, Monitor Presensi Live, Tutup Sesi)
                 - Integrasi API Model AI Sentimen pada Pengajuan Izin + Graceful Degradation Fallback
                 - Tinjauan Izin AI Asprak (Info Pendukung) -> Penetapan Status Excused Absence
                 - Finalisasi UI/UX Modern & Konsisten pada Modul Aslab, Asprak, dan Izin AI

Al (9 FR)    --> Domain Dashboard Lab, Denda Grace Period, Midtrans Payment Gateway, & Notifikasi:
                 - Dashboard Keberlangsungan Lab (Jumlah Lab/Praktikan, Status Lab, Lokasi/Waktu,
                   Jadwal Berlangsung & Mendatang, Riwayat Kegiatan, & Riwayat Keuangan Denda)
                 - Filter Periode Waktu Dashboard (Hari / Minggu / Bulan) berbasis Firebase Real-time
                 - Mesin Evaluasi Keterlambatan (Grace Period Config & Status On-Time/Late)
                 - Penerbitan Tagihan Denda Idempoten (1 Kejadian = 1 Tagihan) & Fine Waiver (Excused)
                 - Backend Midtrans Sandbox (Snap Token Generation & Server Key Isolation)
                 - Webhook Callback Verifier & Pembaruan Status Pembayaran (Pending / Success / Failed)
                 - Checkout Midtrans Snap Webview & Layar Riwayat Pembayaran Persisten Praktikan
                 - Push Notification Otomatis (Tagihan Denda Baru, Pembayaran Sukses, Pembayaran Gagal)
                 - Finalisasi UI/UX Modern & Konsisten pada Modul Dashboard, Tagihan, dan Pembayaran
====================================================================================================
```

---

## 9. Referensi Implementasi untuk Programmer

| Topik / Kebutuhan | Penerapan dalam Proyek | Panduan Resmi & Referensi Teknis |
|---|---|---|
| **Midtrans Snap & API** | Pembuatan transaksi di backend dan tampilan Snap checkout di React Native WebView. | [Midtrans Snap Documentation](https://docs.midtrans.com/reference/snap-basics) |
| **Midtrans Webhook Security** | Verifikasi `SHA-512` signature key dari payload notifikasi HTTP Midtrans. | [Midtrans Handling Notifications](https://docs.midtrans.com/reference/handling-notifications) |
| **AI Sentiment Analysis** | Integrasi REST/SDK model AI dari pengajar dengan timeout protection & fallback manual. | [Google Gemini API Docs](https://ai.google.dev/docs) |
| **Bulk Upload & File Template** | Pembacaan file CSV/JSON lokal (`expo-document-picker`) & unduh template (`expo-file-system` + `expo-sharing`). | [Expo DocumentPicker & FileSystem](https://docs.expo.dev/versions/latest/sdk/document-picker/) |
| **Firestore Batch Operations** | Penulisan massal baris bulk data yang diterima pada Review Editor secara atomik. | [Firestore Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions-and-batched-writes) |
| **Expo Notifications SDK 58** | Pengiriman notifikasi terarah untuk tagihan baru dan verifikasi pembayaran. | [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/) |
