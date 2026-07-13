# Copilot Development Guide

## Gambaran Umum Proyek

Aplikasi ini adalah sistem pencatatan dan manajemen koperasi sekolah yang dibangun dengan Next.js App Router, React 19, dan Supabase. Struktur aplikasi dipisah berdasarkan peran pengguna: admin, pengurus, guru, dan siswa. Autentikasi dikelola dengan cookie sesi server-side dan metadata sesi klien non-sensitif disimpan di `localStorage`.

## Tumpukan Teknologi

- Next.js 16.2.9 (App Router)
- React 19.2.4
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- ESLint dengan `eslint-config-next`
- `react-hot-toast` untuk notifikasi pengguna
- `recharts` untuk grafik dashboard
- Native CSS files untuk tata letak dan halaman khusus

## Struktur Folder

- `src/app`: halaman Next.js, route, dan layout.
  - `(auth)`: halaman login.
  - `(admin)`: halaman admin, kasir, laporan, pesanan, produk, topup, hutang.
  - `(siswa)`: halaman siswa dengan layout khusus.
  - `guru`: halaman guru; tidak dikelompokkan dalam parent route seperti `(siswa)`.
  - `pengurus`: halaman pengurus/ laporan.
  - `api`: route API server-side.
- `src/components`: UI reusable kecil.
- `src/hooks`: custom hooks untuk state dan fetch data.
- `src/utils`: helper utilitas, Supabase client, auth, session, format, dan API response helpers.

## Konvensi Penamaan

- Komponen React: `PascalCase`
- Custom hook: `useSomething`
- Util helper: `camelCase`
- Role constants: `ROLE_ADMIN`, `ROLE_GURU`, `ROLE_SISWA`, `ROLE_PENGURUS`
- Field DB: `snake_case`
- Frontend state/variable: `camelCase`

## Standar Pengkodean

- Semua route API menggunakan `createServerClient()` dari `src/utils/supabase-server.js`.
- Halaman sisi klien memakai `createClient()` dari `src/utils/supabase.js`.
- Response API memakai helper `jsonSuccess()` / `jsonError()` dari `src/utils/api.js`.
- `localStorage` hanya untuk metadata sesi frontend yang non-sensitif (role, nama, nis, nip, kelas, bidang studi).
- Semua auth guard role diletakkan di hook shared `useRequireAuth()`.
- Data fetch di halaman biasanya terjadi pada `useEffect()` dengan `loading` dan `error` state lokal.
- Banyak halaman memakai CSS file khusus halaman, plus shared CSS global di `src/app/shared`.

## Aturan Komponen

- Komponen harus kecil dan fokus.
- Jika logic data-fetch dipakai ulang, ekstrak ke custom hook di `src/hooks`.
- Gunakan `Loading` untuk state loading global halaman.
- Hindari logika render kondisional yang berat di dalam JSX jika bisa diekstrak ke hook atau helper.
- Komponen form seperti `PasswordChangeForm` dan `ProfileInfoCard` sudah ada untuk reuse.

## Aturan API

- Semua `POST` API yang memodifikasi data harus validasi payload terlebih dahulu.
- `jsonSuccess()` mengembalikan `{ success: true, ...data }` dan `jsonError()` mengembalikan `{ success: false, error }`.
- Gunakan `createServerClient()` hanya di API route.
- Jangan expose service key di browser; `SUPABASE_SERVICE_KEY` hanya dipakai server-side.
- Periksa error Supabase secara eksplisit setelah setiap query.

## Aturan Basis Data

- Database utama menggunakan tabel: `siswa`, `guru`, `order_siswa`, `order_guru`, `transaksi`, `detail_transaksi`, `detail_order_siswa`, `detail_order_guru`, `topup_saldo`, `topup_saldo_guru`, `produk`.
- Role-specific tables dan fields dipetakan di hook `useHutang` dan `useSaldo`.
- `siswa` dan `guru` menyimpan password plain text di DB saat ini; ini inkonsisten dengan standar keamanan.
- `order` dan `transaksi` menggunakan `status_order` / `status_pembayaran` untuk alur konfirmasi.
- `topup_saldo` dan `topup_saldo_guru` mencatat histori saldo.

## Pedoman Keamanan

- Auth server menggunakan cookie sesi signed di `src/utils/session.js`.
- `localStorage` hanya menyimpan metadata aman, bukan token akses sensitif.
- Admin/pengurus login dikonfigurasi melalui env vars dengan opsi password plain atau hash.
- API `change-password` memvalidasi `currentPassword`, `newPassword`, `confirmPassword`.
- Saat ini ada risiko keamanan: password guru/siswa dibandingkan plain text di DB.
- Jangan gunakan `NEXT_PUBLIC_` untuk service keys.

## Pedoman Aksesibilitas

- Gunakan elemen semantik HTML: `button`, `table`, `label`, `input`.
- Pastikan `label htmlFor` terpasang pada input form.
- Modal dialog pada halaman hutang perlu `role="dialog"` dan `aria-modal="true"`.
- Tombol dan form harus bisa dijangkau keyboard.

## Aturan Komponen yang Dapat Digunakan Kembali

- `Loading` untuk indikator loading.
- `PasswordChangeForm` untuk formulir password pada guru/siswa.
- `ProfileInfoCard` untuk menampilkan field profil.
- `useRequireAuth()` untuk role guard pada layout peran.
- `useSaldo()` dan `useHutang()` untuk penanganan saldo/hutang siswa/guru.

## Aturan Penanganan Kesalahan

- Tampilkan pesan user-friendly bila fetch gagal.
- Log error ke console server/klien untuk debugging saja.
- Di API, gunakan status HTTP yang sesuai: `400`, `401`, `403`, `404`, `500`.
- Di klien, tangani `response.ok` dan `result.success` secara eksplisit.
- Sering kali halaman mengembalikan pesan generik saat error Supabase terjadi.

## Aturan Pengembangan AI

- Jangan ubah arsitektur besar tanpa tinjauan; dokumentasikan konsistensi terlebih dahulu.
- Jika menemukan duplikasi logika, ekstrak ke hook/util lalu update dokumentasi.
- Jangan menambahkan aturan baru yang bertentangan dengan bentuk nyata kode saat ini.
- Fokus pada dokumentasi arsitektur yang ada, bukan re-arsitektur lengkap.

## Definisi Selesai (DoD)

- Perubahan diterapkan tanpa memecah build Next.js.
- `npm run lint` dan `npm run build` berhasil.
- Semua route role masih dapat mengautentikasi dan menavigasi sesuai role.
- Tidak ada referensi ke service key di browser.
- Error API ditangani dengan format `success/error` konsisten.
- Komponen reusable dipindahkan ke `src/components` atau `src/hooks` ketika diperlukan.
- Dokumentasi `copilot.md` diperbarui untuk mencerminkan pola yang sebenarnya.

## Rekomendasi Perbaikan

1. Inkonsistensi struktur route:
   - `guru` tidak dikelompokkan dalam folder route berawalan `(...)` sementara `siswa` dan `admin` menggunakan group.
   - Standarisasi grup route memudahkan layout dan middleware per role.

2. Lokal formatting dan hydration:
   - Banyak penggunaan `toLocaleString()` tanpa locale spesifik.
   - Standarisasi ke `toLocaleString("id-ID")` untuk menghindari mismatch SSR/client.

3. Hooks fetch pattern yang tidak konsisten:
   - `useStudent` / `useTeacher` memakai `await Promise.resolve()` sebagai workaround.
   - `useEffect` pada hook dan halaman sering memanggil async langsung; gunakan pola `async function load()` dengan `void load()` dan dokumentasikan konsistensi.

4. Duplikasi/unused files:
   - `src/app/utils/auth.js` tampak tidak dipakai; util utama berada di `src/utils/auth.js`.
   - `src/components/ToastProvider.jsx` tidak diimpor/digunakan.
   - `src/app/page.module.css` tidak ditemukan referensinya.

5. Keamanan password:
   - Saat ini guru/siswa password disimpan dan dibandingkan sebagai plain string.
   - Standarisasi hashing password di sisi server dan jangan simpan plain text.

6. Supabase client:
   - `createClient()` dipanggil di banyak file.
   - Pertimbangkan centralisasi lebih kuat di util shared jika refactor diizinkan.

7. Styles:
   - Banyak CSS file halaman individual dan beberapa inline style.
   - Dokumentasikan bahwa proyek menggunakan CSS global/halaman, bukan CSS modules.

8. Auth state:
   - `useRequireAuth` bergantung pada `localStorage` metadata session.
   - Standarisasi auth guard agar server/client tetap sinkron dengan cookie session.
