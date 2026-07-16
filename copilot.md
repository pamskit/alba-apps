# Alba Apps - Copilot Reference

Dokumen ini merangkum struktur kode dan konvensi penting di repositori ini agar agent/developer tidak mengandalkan asumsi lama.

## 1. Gambaran Umum

Alba Apps adalah aplikasi koperasi sekolah digital untuk penjualan produk, manajemen saldo, pembayaran hutang, order, dan laporan transaksi.

### Stack

| Komponen | Detail |
|---|---|
| Framework | Next.js 16 App Router |
| Bahasa | JavaScript / JSX, tanpa TypeScript |
| Database | Supabase PostgreSQL |
| Auth | Hybrid session: HttpOnly cookie untuk server check + localStorage untuk state client |
| UI library | react-hot-toast, react-select, recharts |

## 2. Role Pengguna

Ada 4 role yang dipakai di codebase:

| Role | Identifier Login | Sumber Password | Redirect Setelah Login |
|---|---|---|---|
| admin | username dari env | env `ADMIN_PASSWORD` atau `ADMIN_PASSWORD_HASH` | `/admin/dashboard` |
| pengurus | username dari env | env `PENGURUS_PASSWORD` atau `PENGURUS_PASSWORD_HASH` | `/pengurus/laporan` |
| guru | NIP numeric dari tabel `guru` | plain-text di database | `/guru/dashboard` |
| siswa | NIS numeric dari tabel `siswa` | plain-text di database | `/dashboard` |

## 3. Route Map Aktual

Root page merender komponen login yang sama dengan route auth.

### App shell

- `src/app/page.js` -> redirect komponen login
- `src/app/(auth)/login/page.jsx` -> halaman login utama
- `src/app/layout.js` -> root layout, global CSS, dan `Toaster`
- `src/app/not-found.jsx` -> halaman 404

### Admin

Route group `(admin)` menghasilkan path `/admin/...` dan halaman-halamannya sekarang berada di:

- `/admin/dashboard` -> `src/app/(admin)/admin/page.jsx`
- `/admin/kasir` -> `src/app/(admin)/kasir/page.jsx`
- `/admin/hutang` -> `src/app/(admin)/hutang/page.jsx`
- `/admin/laporan` -> `src/app/(admin)/laporan/page.jsx`
- `/admin/order-siswa` -> `src/app/(admin)/order-siswa/page.jsx`
- `/admin/order-guru` -> `src/app/(admin)/order-guru/page.jsx`
- `/admin/produk` -> `src/app/(admin)/produk/page.jsx`
- `/admin/topup-saldo` -> `src/app/(admin)/topup-saldo/page.jsx`
- `/admin/user` -> `src/app/(admin)/user/page.jsx`

### Siswa

Route group `(siswa)` menghasilkan path root, bukan `/siswa/...`:

- `/dashboard` -> `src/app/(siswa)/dashboard/page.jsx`
- `/beli-produk` -> `src/app/(siswa)/beli-produk/page.jsx`
- `/saldo` -> `src/app/(siswa)/saldo/page.jsx`
- `/hutang-saya` -> `src/app/(siswa)/hutang-saya/page.jsx`
- `/settings` -> `src/app/(siswa)/settings/page.jsx`

### Guru

Folder `guru/` bukan route group, jadi path-nya pakai prefix `/guru`:

- `/guru/dashboard` -> `src/app/guru/dashboard/page.jsx`
- `/guru/beli-produk` -> `src/app/guru/beli-produk/page.jsx`
- `/guru/saldo` -> `src/app/guru/saldo/page.jsx`
- `/guru/hutang-saya` -> `src/app/guru/hutang-saya/page.jsx`
- `/guru/profile` -> `src/app/guru/profile/page.jsx`

### Pengurus

- `/pengurus/laporan` -> `src/app/pengurus/laporan/page.jsx`

## 4. Auth dan Session

### Login flow

1. User mengisi identifier + password di halaman login.
2. `POST /api/auth/login` memeriksa urutan: admin -> pengurus -> guru -> siswa.
3. Admin dan pengurus divalidasi dari environment variable.
4. Guru dan siswa divalidasi ke Supabase berdasarkan NIP/NIS.
5. Jika sukses, server mengirim HttpOnly cookie `koperasi_session` dan response `session`.
6. Client menyimpan session aman ke localStorage dengan key `koperasi-auth`.
7. Redirect dilakukan berdasarkan role.

### Logout

`handleLogout` dari `useRequireAuth()` memanggil `/api/auth/logout`, membersihkan localStorage, lalu redirect ke `/`.

### Client-side guard

Semua layout protected memakai `useRequireAuth(role)`:

```js
const { loading, handleLogout } = useRequireAuth("admin");
```

Hook ini membaca session dari localStorage. Jika role salah atau session tidak ada, user akan di-redirect ke route yang sesuai atau kembali ke `/`.

### Server-side auth

Tidak ada `middleware.ts`. Proteksi route dilakukan client-side, sedangkan API penting yang memerlukan verifikasi cookie server-side adalah:

- `POST /api/auth/change-password`
- `POST /api/guru/auto-topup`

## 5. Data Fetching

### Supabase client

- Browser/client hook memakai `createClient()` dari `src/utils/supabase.js`
- API route/server memakai `createServerClient()` dari `src/utils/supabase-server.js`

### Hook utama

- `useSaldo({ role })` membaca profil dan histori saldo.
- `useHutang({ role })` membaca profil, histori hutang, dan state pembayaran.
- `useStudent()`, `useTeacher()`, `useStudentProfile()`, `useTeacherProfile()` menangani profil masing-masing role.
- `useDashboardSummary()` dipakai untuk ringkasan dashboard admin.

### Pola dual-read

Repo ini masih dalam masa migrasi, jadi beberapa hook membaca tabel baru dan legacy sekaligus:

- `useSaldo()` menggabungkan `saldo_log` dengan `topup_saldo` / `topup_saldo_guru`, lalu deduplikasi.
- `useHutang()` menggabungkan `transaksi` dengan `order_siswa` / `order_guru` untuk histori hutang.

### Direct Supabase dari admin

Beberapa halaman admin masih melakukan mutasi langsung dari browser memakai anon key. Keamanan bergantung pada RLS Supabase, bukan API route.

## 6. API Routes

### Auth

- `POST /api/auth/login` -> login admin/pengurus/guru/siswa, set session cookie.
- `POST /api/auth/logout` -> hapus cookie session.
- `POST /api/auth/change-password` -> ubah password siswa/guru setelah validasi cookie.

### Orders

- `POST /api/orders/create` -> dual-write ke tabel legacy order dan `transaksi`.
- `POST /api/orders/confirm` -> masih baca flow legacy untuk konfirmasi order.
- `POST /api/orders/reject` -> masih baca flow legacy untuk penolakan order.

### Saldo dan hutang

- `POST /api/topup-saldo` -> top-up saldo siswa/guru dan log ke `saldo_log`.
- `POST /api/payment-hutang` -> kurangi hutang, dan jika metode `Saldo` maka saldo juga ikut berkurang.
- `POST /api/guru/auto-topup` -> bonus bulanan Rp 50.000 untuk guru, dengan cek sekali per bulan.

### Catatan perilaku penting

- `topup-saldo` menulis ke `saldo_log` dengan `log_type: Top-up`.
- `payment-hutang` menulis ke `transaksi` dan, untuk pembayaran dari saldo, juga menulis ke `saldo_log`.
- `guru/auto-topup` masih menulis ke tabel legacy `topup_saldo_guru`.

## 7. Skema Database Inti

### Tabel aktif

- `siswa` -> `nis`, `nama_siswa`, `kelas`, `password`, `saldo`, `total_hutang`
- `guru` -> `nip`, `nama_guru`, `bidang_studi`, `password`, `saldo`, `total_hutang`
- `produk` -> data produk dan stok
- `transaksi` -> tabel utama baru untuk order, top-up, hutang payment, refund, dan metadata lain
- `detail_transaksi` -> detail item per transaksi
- `saldo_log` -> histori saldo lintas role

### Tabel legacy

Masih dipakai selama migrasi dan jangan dihapus dulu:

- `order_siswa`
- `order_guru`
- `detail_order_siswa`
- `detail_order_guru`
- `topup_saldo`
- `topup_saldo_guru`

## 8. Komponen Shared

### Loading

`<Loading />` dipakai di layout protected dan halaman yang menunggu data.

### PasswordChangeForm

Form reusable untuk ganti password di:

- `src/app/(siswa)/settings/page.jsx`
- `src/app/guru/profile/page.jsx`

### ProfileInfoCard

Dipakai untuk menampilkan ringkasan profil dengan state loading dan empty state.

### Sidebar

`AdminSidebar`, `SiswaSidebar`, dan `GuruSidebar` memakai toggle mobile dan backdrop overlay dengan class BEM yang konsisten.

## 9. Konvensi Penamaan

| Area | Konvensi | Contoh |
|---|---|---|
| Komponen | PascalCase | `AdminSidebar.jsx` |
| Hooks | `use` + camelCase | `useSaldo.js` |
| Utils | camelCase | `supabase-server.js` |
| Direktori route | kebab-case | `beli-produk/` |
| CSS class | BEM | `admin-layout__content` |
| Field DB | snake_case Indonesia | `nama_siswa`, `total_hutang` |
| ID transaksi | string manual | `trx_hutang_123` |

## 10. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

SESSION_COOKIE_SECRET=random-secret-string-min-32-chars

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=sha256-hash-of-password

PENGURUS_USERNAME=pengurus
PENGURUS_PASSWORD_HASH=sha256-hash-of-password
```

## 11. Hal Penting

1. `src/app/(siswa)` adalah route group, jadi path siswa ada di root seperti `/dashboard`, bukan `/siswa/dashboard`.
2. `src/app/guru` bukan route group, jadi semua path guru memakai prefix `/guru`.
3. Auth proteksi route tidak pakai middleware; jangan menganggap halaman aman hanya karena layout-nya protected.
4. `layout.js` root mengimpor beberapa CSS admin/shared secara global, jadi perubahan CSS bisa berdampak lintas role.
5. Migrasi data masih dual-write / dual-read. Jangan mengubah satu sisi tanpa cek dampaknya ke tabel legacy dan tabel baru.
6. Password guru dan siswa masih plain-text di database. Admin dan pengurus memakai kredensial dari env.
