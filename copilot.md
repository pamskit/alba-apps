# Copilot Development Guide

## Tujuan
Dokumen ini adalah acuan untuk pengembangan aplikasi Koperasi Sekolah Digital. Gunakan sebagai panduan ketika membuat fitur baru, memperbaiki bug, atau merapikan kode.

## Daftar Tugas Utama
1. Konsolidasikan mekanisme autentikasi dan sesi
   - Hapus atau satukan `localStorage` + cookie session.
   - Gunakan satu util auth tunggal untuk client dan server.
   - Buat middleware atau hook reusable untuk mengecek role.
2. Reuse dan refactor layout otentikasi
   - Buat helper auth guard seperti `useRequireAuth(role)`.
   - Kurangi duplikasi pada layout halaman role.
   - Buat komponen logout terpusat.
3. Konsolidasi Supabase client
   - Pisahkan client/browser dan server/service key.
   - Gunakan util Supabase tunggal di seluruh file.
   - Hindari `createClient()` manual di banyak file.
4. Struktur API yang konsisten
   - Buat helper response JSON standar di `src/utils/api.js`.
   - Gunakan `src/utils/supabase-server.js` untuk server Supabase client.
   - Standarkan validasi request body.
   - Gunakan transaksi DB untuk operasi multi-step.
   - Normalisasikan nama properti antara frontend dan backend.
5. Perbaiki keamanan password dan session
   - Hindari password plain text di database.
   - Pakai hashing secure (misalnya `bcrypt`) untuk kredensial.
   - Pastikan cookie session HttpOnly + Secure di production.
6. Modularisasi UI
   - Pecah halaman besar menjadi komponen kecil.
   - Pindahkan logic data-fetch ke custom hook bila perlu.
   - Hindari inline style besar di komponen.
7. Terapkan linting dan formatting konsisten
   - Tambahkan Prettier dan plugin ESLint yang relevan.
   - Buat script `lint`, `lint:fix`, dan `format`.

## Aturan Umum Pengembangan

### 1. Struktur Folder
- `src/app` untuk halaman dan route Next.js.
- `src/components` untuk komponen UI reusable.
- `src/hooks` untuk custom hook dan logika state reusable.
- `src/utils` untuk helper/fungsi utilitas dan adapter API.
- `src/lib` atau `src/services` untuk client API dan integrasi eksternal jika diperlukan.

### 2. Auth dan Session
- Gunakan satu sumber truth session.
- Simpan data otentikasi sensitif di server-side cookie, bukan di `localStorage`.
- `localStorage` boleh dipakai hanya untuk metadata sesi frontend yang non-sensitif (role, nama, id pengguna untuk tampilan), tapi jangan diandalkan sebagai otentikasi utama.
- Semua pemeriksaan role harus dilakukan melalui helper dan tidak langsung di setiap halaman.

### 3. Supabase
- Gunakan `@supabase/supabase-js` di client dengan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Gunakan service key di route server saja, tidak di browser.
- Buat util seperti `src/utils/supabase.js` untuk browser client dan `src/utils/supabase-server.js` untuk server client.

### 4. Naming Convention
- Frontend / JavaScript: `camelCase`
- API payload / backend DB field: `snake_case`
- Komponen React: `PascalCase`
- Hook custom: `useSomething`
- Role constants: `ROLE_ADMIN`, `ROLE_GURU`, `ROLE_SISWA`, `ROLE_PENGURUS`

### 5. Error Handling
- Standarkan response error di API:
  - `{ success: false, error: "pesan" }`
  - atau gunakan util `jsonError()` / `jsonSuccess()` dari `src/utils/api.js`.
- Frontend harus menampilkan pesan error jelas ke pengguna.
- Log error hanya di server untuk debugging, jangan ditampilkan mentah ke user.

### 6. Komponen UI
- Komponen harus kecil dan fokus pada satu tanggung jawab.
- Pisahkan tampilan dan data-fetching bila memungkinkan.
- Gunakan CSS module jika gaya khusus halaman diperlukan.
- Hindari deklarasi style inline kecuali untuk kondisi spesifik yang kecil.

### 7. Testing dan Validasi
- Selalu validasi input request pada API routes.
- Gunakan default values dan tipe data yang konsisten.
- Pastikan response API selalu konsisten formatnya.

### 8. Dokumentasi dan Catatan
- Tambahkan komentar pendek bila logika tidak langsung jelas.
- Gunakan `copilot.md` sebagai acuan developer selanjutnya.
- Jika membuat fitur baru, tambahkan ringkasan di `copilot.md` bila aturan berubah.

## Tips Pengembangan
- Refactor secara bertahap: mulai dari auth/shared util, lalu halaman besar.
- Bila menemukan kode duplikat lebih dari sekali, refactor ke helper.
- Prioritaskan keamanan data auth dan logika payment.
- Selalu review `package.json` dan dependencies yang ada sebelum memasang paket baru.

## Checklist Sebelum Merge
- [x] Auth/session sudah konsisten
- [x] Layout guard role reusable
- [x] Supabase client tersentralisasi
- [x] API response dan error handling standar
- [ ] Komponen halaman sudah modular
- [ ] Tidak ada password plain text baru
- [x] Lint/format berjalan tanpa error
- [x] `copilot.md` tetap diperbarui jika aturan baru ditambahkan

## Todo Saat Ini
- [ ] Modularisasi halaman besar menjadi komponen UI kecil
- [ ] Ekstrak logic fetch/data ke custom hook reusable
- [ ] Tambahkan validasi input pada API route dan form frontend
- [ ] Terapkan hashing password dan periksa password di database
- [ ] Tambahkan testing ringan untuk auth flow dan API response
- [ ] Review ulang duplikasi logika dan styles di `src/app/(siswa)` dan `src/app/guru`

## Status Saat Ini
- `npm run lint` sudah dilalui tanpa error.
- Semua halaman autentikasi dan role guard telah menggunakan shared helper `useRequireAuth` dan `getRoleSession`.
- `useEffect` pada halaman yang melakukan fetch data sudah diperbaiki agar tidak memicu peringatan `setState-in-effect`.
- Struktur API sudah berada pada pola respons standar dengan `jsonError`/`jsonSuccess`.

## Langkah Selanjutnya
1. Refactor halaman besar menjadi komponen UI yang lebih kecil.
2. Ekstrak logika fetch/data ke custom hook jika dipakai ulang di banyak halaman.
3. Tambahkan validasi input pada API route dan form frontend.
4. Terapkan hashing password dan cek storage password pada database.
5. Tambahkan testing ringan untuk auth flow dan API response konsistensi.
6. Periksa ulang `src/app/(siswa)` dan `src/app/guru` untuk duplikasi logika dan styles.

## Ringkasan Perubahan Terakhir
- Ditambahkan `src/utils/api.js` untuk response helper `jsonError`/`jsonSuccess`.
- Ditambahkan `src/utils/supabase-server.js` untuk Supabase server-side client.
- Semua API route sudah beralih ke helper respons standar dan util server Supabase.
- `src/hooks/useRequireAuth.js` dibuat untuk shared auth guard di layout role.
- `src/utils/auth.js` diperbarui agar hanya menyimpan metadata aman ke `localStorage`.
- `useEffect` pada halaman data-fetch diperbaiki sehingga tidak lagi memicu lint `react-hooks/set-state-in-effect`.
- `copilot.md` diupdate dengan aturan baru untuk util API dan session metadata.
