# Firebase Setup

## Yang Sudah Ada di Proyek

- Firebase JavaScript SDK dan AsyncStorage terpasang melalui `npx expo install`.
- `src/lib/firebase.ts` menginisialisasi Firebase App, Authentication, dan Cloud Firestore.
- Sesi Firebase Authentication pada Android/iOS menggunakan AsyncStorage sehingga login tetap tersedia setelah aplikasi dibuka kembali.
- `.env.example` menyediakan semua identifier Firebase yang dibutuhkan. File `.env` diabaikan Git.

## Konfigurasi Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/) lalu buat atau pilih project Firebase.
2. Tambahkan **Web app** pada Project settings. Salin nilai konfigurasi Web App yang diberikan Firebase.
3. Salin `.env.example` menjadi `.env`, kemudian isi seluruh variabel `EXPO_PUBLIC_FIREBASE_*` dari konfigurasi tersebut.
4. Di **Authentication** > **Sign-in method**, aktifkan provider **Email/Password**.
5. Di **Firestore Database**, buat Cloud Firestore database dengan **Standard edition** dan pilih lokasi yang dekat dengan pengguna utama. Gunakan Production mode untuk data nyata.
6. Terapkan file `firestore.rules` sebelum aplikasi memakai data nyata. Rules tersebut membatasi akses terhadap skema `users`, `classes`, `members`, `sessions`, `attendance`, dan `leaveRequests` pada SRS Sprint 2.
7. Hentikan lalu jalankan kembali development server setelah mengubah `.env`.

## Menerapkan Firestore Rules

Paling cepat, buka **Firestore Database** > **Rules** di Firebase Console, ganti isi editor dengan `firestore.rules`, lalu klik **Publish**. Untuk deployment melalui CLI, login dan pilih project Firebase terlebih dahulu, lalu jalankan:

```powershell
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules
```

Rules ini mengizinkan pembuatan profil dengan peran yang dipilih ketika registrasi. Jika hanya pengajar/admin yang boleh menjadikan akun sebagai Asisten, pembuatan profil Asisten harus dipindahkan ke Cloud Function/admin workflow; Security Rules tidak dapat membedakan pendaftar Asisten yang sah tanpa sumber otorisasi tambahan.

## Perilaku Rules yang Penting

- Praktikan hanya dapat membuat satu presensi dan satu pengajuan izin untuk setiap sesi karena ID dokumen wajib berbentuk `{sessionId}_{studentId}`. Dokumen tersebut tidak dapat ditimpa oleh client.
- Praktikan hanya dapat presensi pada sesi `open` dan hanya jika terdaftar sebagai anggota kelas. Izin hanya dapat diajukan saat sesi `scheduled` atau `open`.
- Asisten hanya dapat mengelola kelas yang memuat UID-nya pada `assistantIds`, lalu hanya dapat membaca presensi/izin dari kelas tersebut.
- Client tidak dapat mengubah hasil AI atau keputusan izin. Cloud Function/proxy yang memakai Admin SDK dapat menyimpan klasifikasi AI; Asisten hanya dapat mengubah keputusan dari `pending` menjadi `approved` atau `rejected`.
- Penghapusan class di Firestore tidak menghapus subkoleksi secara otomatis. Hapus dokumen anggota dan sesi terlebih dahulu, kemudian hapus class. Rules hanya mengizinkan penghapusan sesi yang masih `scheduled`.
- Query client harus selalu dibatasi sesuai scope Rules, misalnya riwayat presensi dengan `where('studentId', '==', uid)` dan rekap dengan `where('sessionId', '==', sessionId)`.

## Catatan Keamanan

- Firebase Web API key dan identifier aplikasi memang digunakan pada client. Keamanan data tetap ditegakkan oleh Firebase Authentication dan Firestore Security Rules.
- Jangan menyimpan secret API AI, service-account JSON, atau token backend pada `.env` berprefix `EXPO_PUBLIC_`; nilai tersebut dibundel ke aplikasi.
- Akses API AI yang membutuhkan secret harus diproksikan oleh backend/Cloud Function.

## Konfigurasi API AI

Project Firebase `manajemenpraktikum` memakai target URL berikut untuk Cloud Function di region `asia-southeast2`:

```env
EXPO_PUBLIC_AI_CLASSIFIER_URL=https://asia-southeast2-manajemenpraktikum.cloudfunctions.net/classifyLeaveReason
```

URL ini aktif setelah Cloud Function `classifyLeaveReason` dideploy ke region tersebut. Aplikasi client hanya mengirim Firebase ID token dan `leaveRequestId`; Function memuat alasan langsung dari Firestore setelah memeriksa kepemilikan Praktikan. API key Gemini tetap berada di environment server.

### Deploy Cloud Function Gemini

Folder `functions/` sudah berisi Function HTTP yang memverifikasi Firebase ID token, memeriksa kepemilikan pengajuan, meminta kategori ke Gemini, lalu menulis `aiStatus`, `aiCategory`, dan `aiConfidence`. Function tidak pernah menulis `status` izin sebagai `approved` atau `rejected`.

Cloud Functions for Firebase membutuhkan project dengan paket billing **Blaze**. Setelah mengaktifkannya, jalankan perintah berikut dari root proyek:

```powershell
npx firebase-tools login
npx firebase-tools functions:secrets:set GEMINI_API_KEY --project manajemenpraktikum
npx firebase-tools deploy --only functions,firestore:rules --project manajemenpraktikum
```

Saat perintah kedua meminta nilai secret, tempel API key Gemini langsung pada terminal. Jangan kirim key tersebut ke chat, jangan menaruhnya di `.env`, dan jangan memakai prefix `EXPO_PUBLIC_`. Setelah deploy, endpoint memakai URL pada `.env.example`.

Function memakai model `gemini-3.8-flash`. Jika project Gemini-mu tidak mempunyai akses ke model tersebut, ganti nilai `model` pada `functions/src/index.ts` dengan model Gemini yang tersedia pada project API key-mu, lalu deploy ulang.

Jangan mengizinkan endpoint AI mengubah status izin menjadi diterima/ditolak. Endpoint hanya boleh menyimpan/menyediakan hasil klasifikasi; keputusan akhir tetap ditulis oleh Asisten.
