# Alba Apps — Copilot Reference

Dokumen ini adalah panduan teknis lengkap untuk AI agent dan developer yang bekerja di repositori ini.

---

## 1. Gambaran Umum

**Alba Apps** adalah aplikasi manajemen koperasi sekolah digital. Fitur utama:
- Penjualan produk ke siswa dan guru
- Manajemen saldo (top-up, pengeluaran)
- Manajemen hutang (kredit) dan pembayaran
- Manajemen order dan konfirmasi
- Laporan transaksi dengan visualisasi chart dan ekspor CSV

| Stack | Detail |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Bahasa | JavaScript (JSX), **tanpa TypeScript** |
| Database | Supabase (PostgreSQL) |
| Auth | Custom session (HttpOnly cookie + localStorage) |
| UI Libs | react-hot-toast, react-select, recharts |

---

## 2. Role Pengguna

Ada 4 role dengan akses berbeda:

| Role | Login Identifier | Sumber Password | Redirect Setelah Login | Catatan |
|------|-----------------|-----------------|----------------------|---------|
| `admin` | username (env `ADMIN_USERNAME`) | env var (`ADMIN_PASSWORD` atau `ADMIN_PASSWORD_HASH`) | `/admin` | Full akses |
| `pengurus` | username (env `PENGURUS_USERNAME`) | env var (`PENGURUS_PASSWORD` atau `PENGURUS_PASSWORD_HASH`) | `/pengurus/laporan` | Read-only, laporan saja |
| `guru` | NIP (angka, dari tabel `guru`) | Plain-text di DB | `/guru/dashboard` | Portal guru |
| `siswa` | NIS (angka, dari tabel `siswa`) | Plain-text di DB | `/dashboard` | Portal siswa |

---

## 3. Struktur Folder

```
src/
├── app/
│   ├── layout.js               # Root layout, import global CSS + ToastProvider
│   ├── page.js                 # Route / → halaman login (UnifiedLoginPage)
│   ├── not-found.jsx
│   ├── (auth)/
│   │   └── login/page.jsx      # Alternatif route login
│   ├── (admin)/                # Route group admin → path: /admin, /kasir, /produk, dll
│   │   ├── layout.js           # Guard: useRequireAuth('admin')
│   │   ├── AdminSidebar.jsx
│   │   ├── admin/page.jsx      # Dashboard admin
│   │   ├── kasir/page.jsx
│   │   ├── produk/page.jsx
│   │   ├── user/page.jsx
│   │   ├── hutang/page.jsx
│   │   ├── order-siswa/page.jsx
│   │   ├── order-guru/page.jsx
│   │   ├── topup-saldo/page.jsx
│   │   └── laporan/page.jsx
│   ├── (siswa)/                # Route group siswa → path ROOT: /dashboard, /beli-produk, dll
│   │   ├── layout.js           # Guard: useRequireAuth('siswa')
│   │   ├── SiswaSidebar.jsx
│   │   ├── dashboard/page.jsx
│   │   ├── beli-produk/page.jsx
│   │   ├── saldo/page.jsx
│   │   ├── hutang-saya/page.jsx
│   │   └── settings/page.jsx
│   ├── guru/                   # Bukan route group → path: /guru/dashboard, /guru/beli-produk, dll
│   │   ├── layout.js           # Guard: useRequireAuth('guru')
│   │   ├── GuruSidebar.jsx
│   │   ├── dashboard/page.jsx
│   │   ├── beli-produk/page.jsx
│   │   ├── saldo/page.jsx
│   │   ├── hutang-saya/page.jsx
│   │   └── profile/page.jsx
│   ├── pengurus/               # Path: /pengurus/laporan
│   │   ├── layout.js           # Guard: useRequireAuth('pengurus')
│   │   └── laporan/page.jsx
│   ├── api/
│   │   ├── auth/login/route.js
│   │   ├── auth/logout/route.js
│   │   ├── auth/change-password/route.js
│   │   ├── orders/create/route.js
│   │   ├── orders/confirm/route.js
│   │   ├── orders/reject/route.js
│   │   ├── topup-saldo/route.js
│   │   ├── payment-hutang/route.js
│   │   └── guru/auto-topup/route.js
│   ├── shared/                 # CSS shared antar role
│   └── utils/auth.js           # (kosong/placeholder)
├── components/
│   ├── Loading.jsx             # Spinner generic (props: message, size)
│   ├── PasswordChangeForm.jsx  # Form ganti password (reusable)
│   ├── ProfileInfoCard.jsx     # Card info profil (props: title, fields, loading)
│   └── ToastProvider.jsx       # react-hot-toast Toaster
├── hooks/
│   ├── useRequireAuth.js       # Client-side auth guard
│   ├── useDashboardSummary.js  # Data dashboard admin
│   ├── useSaldo.js             # Riwayat saldo (siswa & guru)
│   ├── useHutang.js            # Data hutang (siswa & guru)
│   ├── useStudent.js           # Data siswa
│   ├── useStudentProfile.js    # Profil siswa
│   ├── useTeacher.js           # Data guru
│   └── useTeacherProfile.js    # Profil guru
└── utils/
    ├── supabase.js             # createClient() → browser client (anon key)
    ├── supabase-server.js      # createServerClient() → server client (service key)
    ├── auth.js                 # saveAuthSession, clearAuthSession, getRoleSession, getRedirectRouteByRole
    ├── session.js              # createSessionCookie, getSessionFromCookieHeader (HMAC)
    ├── api.js                  # Wrapper fetch helper
    ├── hutang.js               # Helper kalkulasi hutang
    └── saldo.js                # Helper kalkulasi saldo
```

> **Penting:**
> - `(siswa)` adalah route group → halaman siswa ada di path root (`/dashboard`, bukan `/siswa/dashboard`)
> - `guru` bukan route group → path pakai prefix `/guru/`

---

## 4. Alur Autentikasi

### Login
1. User submit identifier + password di `/` (atau `/login`)
2. `POST /api/auth/login` → cek urutan: admin → pengurus → siswa (by NIS) → guru (by NIP)
3. Password admin/pengurus: SHA-256 hash atau plain-text dari env var
4. Password siswa/guru: plain-text di database
5. Sukses → server set HttpOnly cookie `koperasi_session` (HMAC-SHA256, 7 hari)
6. Client simpan session ke `localStorage` key `koperasi-auth`, redirect by role

### Logout
1. `POST /api/auth/logout` → clear cookie (Max-Age=0)
2. Client hapus localStorage, redirect ke `/`

### Client-side Guard
```js
// Setiap protected layout menggunakan:
const { loading, handleLogout } = useRequireAuth('admin'); // atau 'siswa', 'guru', 'pengurus'
```
Hook membaca localStorage. Jika tidak ada session → redirect `/`. Jika role salah → redirect ke home role tersebut.

### Server-side Auth
Hanya beberapa API route yang verifikasi cookie server-side:
- `POST /api/auth/change-password`
- `POST /api/guru/auto-topup`

> **Tidak ada `middleware.ts`** — semua proteksi route dilakukan client-side via `useRequireAuth`.

---

## 5. Pola Data Fetching

### Supabase Client
```js
// Browser (pages/hooks) — gunakan ini
import { createClient } from '@/utils/supabase'
const supabase = createClient() // anon key

// Server (API routes) — gunakan ini
import { createServerClient } from '@/utils/supabase-server'
const supabase = createServerClient() // service key
```

### Custom Hooks
Semua data fetching di halaman menggunakan custom hooks:

```js
// Contoh penggunaan di page
const { data, loading, error, refresh } = useSaldo({ role: 'siswa' })
const { hutang, loading } = useHutang({ role: 'guru' })
const { student, loading } = useStudent()
```

Hooks membaca ID user dari `getRoleSession()` (localStorage), lalu query Supabase.

### Role Config Pattern
Hooks seperti `useSaldo` dan `useHutang` menerima `{ role }` dan menggunakan config object internal untuk menentukan tabel/field yang di-query. Ini memungkinkan satu hook dipakai untuk siswa dan guru.

### Parallel Fetching
Gunakan `Promise.all()` untuk query paralel:
```js
const [result1, result2] = await Promise.all([
  supabase.from('siswa').select('*'),
  supabase.from('produk').select('*')
])
```

### Direct Supabase dari Admin Pages
Halaman-halaman admin (produk, user, kasir, hutang, order) langsung query/mutasi Supabase dari browser menggunakan anon key — **tidak melalui API route**. Keamanannya bergantung pada Supabase RLS policies.

---

## 6. API Routes

### `POST /api/auth/login`
```json
Body: { "identifier": "string", "password": "string" }
Response: { "success": true, "session": { "role": "...", "nis/nip/username": "..." } }
```

### `POST /api/auth/logout`
Tidak perlu body. Menghapus cookie session.

### `POST /api/auth/change-password`
```json
Body: { "currentPassword": "string", "newPassword": "string", "confirmPassword": "string" }
Auth: HttpOnly cookie (role: siswa atau guru)
```
Validasi: `newPassword` minimal 6 karakter, harus cocok dengan `confirmPassword`.

### `POST /api/orders/create`
```json
Body: {
  "userType": "siswa|guru",
  "userId": "number",
  "items": [{ "produk_id": "number", "jumlah": "number" }],
  "metode_pembayaran": "Saldo|Hutang"
}
```
Logic:
- Validasi stok produk
- Tulis ke tabel legacy (`order_siswa`/`order_guru`) **DAN** tabel baru (`transaksi`) — dual-write
- Jika Saldo: langsung potong saldo user
- Jika Hutang: hutang baru ditambahkan saat order **dikonfirmasi**

### `POST /api/orders/confirm`
```json
Body: { "orderId": "number", "userType": "siswa|guru" }
```
Baca dari tabel legacy. Kurangi stok produk. Jika Hutang: tambah `total_hutang` user.

### `POST /api/orders/reject`
```json
Body: { "orderId": "number", "userType": "siswa|guru" }
```
Jika metode Saldo: refund saldo user + log Refund ke `saldo_log`.

### `POST /api/topup-saldo`
```json
Body: { "userType": "siswa|guru", "userId": "number", "amount": "number", "metode": "string", "note": "string" }
```
Tambah saldo user + log ke `saldo_log` (log_type: `Top-up`).

### `POST /api/payment-hutang`
```json
Body: { "userType": "siswa|guru", "userId": "number", "amount": "number", "paymentMethod": "Tunai|QRIS|Saldo|Transfer" }
```
Metode pembayaran: `Tunai` (tunai oleh admin), `QRIS`, `Transfer`, `Saldo` (potong dari saldo).
Kurangi `total_hutang`. Buat record di `transaksi`.

### `POST /api/guru/auto-topup`
Auth: HttpOnly cookie (role: guru).
Tambah bonus Rp 50.000/bulan ke saldo guru (satu kali per bulan). Tulis ke `topup_saldo_guru` (tabel legacy).

---

## 7. Skema Database

### Tabel Aktif (Baru)

#### `siswa`
| Field | Type | Keterangan |
|-------|------|-----------|
| nis | INT (PK) | Nomor Induk Siswa |
| nama_siswa | TEXT | |
| kelas | TEXT | |
| password | TEXT | **Plain-text** |
| total_hutang | INT DEFAULT 0 | |
| saldo | INT DEFAULT 0 | |

#### `guru`
| Field | Type | Keterangan |
|-------|------|-----------|
| nip | INT (PK) | Nomor Induk Pegawai |
| nama_guru | TEXT | |
| bidang_studi | TEXT | |
| password | TEXT | **Plain-text** |
| total_hutang | INT DEFAULT 0 | |
| saldo | INT DEFAULT 0 | |

#### `produk`
| Field | Type |
|-------|------|
| id | SERIAL (PK) |
| nama_produk | TEXT |
| harga_beli | INT |
| harga_jual | INT |
| stok | INT |
| created_at | TIMESTAMP |

#### `transaksi` *(tabel utama baru)*
| Field | Type | Keterangan |
|-------|------|-----------|
| id | TEXT (PK) | Format: `order_siswa_<timestamp>`, `trx_hutang_<timestamp>` |
| created_at | TIMESTAMP | |
| customer_type | TEXT | `siswa` atau `guru` |
| nis_siswa | INT FK | nullable |
| nip_guru | INT FK | nullable |
| transaction_type | TEXT | `purchase`, `order`, `topup`, `hutang_payment`, `refund` |
| payment_method | TEXT | `Tunai`, `QRIS`, `Saldo`, `Hutang`, `Transfer` |
| payment_status | TEXT | `Lunas`, `Belum Lunas`, `Partial`, `Dibatalkan` |
| order_status | TEXT | `Menunggu`, `Dikonfirmasi`, `Ditolak`, `Selesai`, `Dibatalkan` (nullable — hanya untuk `transaction_type = 'order'`) |
| amount_total | INT | |
| amount_paid | INT | |
| amount_due | INT | |
| note | TEXT | |
| metadata | JSONB | |

#### `detail_transaksi`
| Field | Type |
|-------|------|
| id | SERIAL (PK) |
| transaksi_id | TEXT FK |
| produk_id | INT FK |
| jumlah | INT |
| harga_satuan | INT |
| sub_total | INT |

#### `saldo_log`
| Field | Type | Keterangan |
|-------|------|-----------|
| id | SERIAL (PK) | |
| created_at | TIMESTAMP | |
| customer_type | TEXT | `siswa` atau `guru` |
| nis_siswa | INT FK | nullable |
| nip_guru | INT FK | nullable |
| transaksi_id | TEXT FK | nullable |
| log_type | TEXT | `Top-up`, `Order_Saldo`, `Hutang_Payment`, `Refund`, `Adjustment` |
| amount | INT | Bisa negatif (pengeluaran) |
| balance_before | INT | |
| balance_after | INT | |
| payment_method | TEXT | |
| note | TEXT | |

### Tabel Legacy (Masih Digunakan)

> Aplikasi sedang dalam proses **migrasi** dari tabel legacy ke tabel `transaksi`. Penulisan baru dilakukan ke **kedua sistem** secara bersamaan (dual-write). Jangan hapus tabel legacy sampai migrasi selesai.

| Tabel | Keterangan |
|-------|-----------|
| `order_siswa` | Order siswa (legacy). Masih ditulis oleh `/api/orders/create`. |
| `order_guru` | Order guru (legacy). Masih ditulis oleh `/api/orders/create`. |
| `detail_order_siswa` | Detail order siswa (legacy). |
| `detail_order_guru` | Detail order guru (legacy). |
| `topup_saldo` | Log top-up saldo siswa (legacy). Masih dibaca oleh `useSaldo`. |
| `topup_saldo_guru` | Log top-up saldo guru (legacy). Ditulis oleh `/api/guru/auto-topup`. |

---

## 8. Komponen Shared

### `<Loading />`
```jsx
<Loading message="Memuat data..." size="medium" /> // size: small | medium | large
```

### `<PasswordChangeForm />`
```jsx
<PasswordChangeForm onSubmit={async (data) => { /* data: { currentPassword, newPassword, confirmPassword } */ }} />
```
Digunakan di: `(siswa)/settings/page.jsx`, `guru/profile/page.jsx`

### `<ProfileInfoCard />`
```jsx
<ProfileInfoCard
  title="Informasi Profil"
  fields={[{ label: 'Nama', value: 'John Doe' }, { label: 'Kelas', value: 'XII IPA 1' }]}
  loading={false}
  emptyMessage="Data tidak tersedia"
/>
```

### Sidebar (AdminSidebar, SiswaSidebar, GuruSidebar)
Semua sidebar punya hamburger toggle untuk mobile dengan backdrop overlay. State dikelola lokal dengan `useState(isOpen)`. CSS class BEM: `sidebar`, `sidebar__link`, `sidebar__link--active`.

---

## 9. Konvensi Penamaan

| Hal | Konvensi | Contoh |
|-----|----------|--------|
| Komponen | PascalCase | `AdminSidebar.jsx` |
| Hooks | camelCase prefix `use` | `useSaldo.js` |
| Utilities | camelCase | `supabase.js` |
| Direktori | kebab-case | `beli-produk/` |
| CSS | BEM | `dashboard-card--warning` |
| Field DB | Bahasa Indonesia, snake_case | `nama_siswa`, `total_hutang` |
| ID Transaksi | String manual | `order_siswa_1234567890` |
| Status order | Bahasa Indonesia | `Menunggu`, `Dikonfirmasi`, `Ditolak` |
| Metode bayar | Bahasa Indonesia | `Tunai`, `Saldo`, `Hutang`, `QRIS`, `Transfer` |

---

## 10. Environment Variables

Buat file `.env.local` di root proyek:

```env
# Supabase (wajib)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Session (wajib)
SESSION_COOKIE_SECRET=random-secret-string-min-32-chars

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=sha256-hash-of-password   # atau ADMIN_PASSWORD=plain-text

# Pengurus credentials
PENGURUS_USERNAME=pengurus
PENGURUS_PASSWORD_HASH=sha256-hash-of-password # atau PENGURUS_PASSWORD=plain-text
```

---

## 11. Hal Penting & Gotcha

1. **Dual-write migration** — Penulisan order baru masuk ke tabel legacy (`order_siswa`/`order_guru`) DAN tabel baru (`transaksi`) secara bersamaan. Halaman admin order sudah baca dari `transaksi`, tapi API confirm/reject masih pakai legacy. Jangan break salah satu sisi selama migrasi.

2. **Tidak ada middleware.ts** — Semua proteksi route adalah client-side. Seseorang yang tahu URL bisa mengakses halaman sebelum JS-nya jalan. API routes penting harus verifikasi cookie sendiri.

3. **Password siswa/guru plain-text** — Disimpan langsung di database. Perlu dipertimbangkan untuk di-hash di masa depan.

4. **Admin mutasi langsung ke Supabase** — Halaman admin tidak melalui API route untuk mutasi (create/update/delete produk, user, dll). Keamanan bergantung sepenuhnya pada Supabase RLS policies.

5. **Dual-read saldo** — `useSaldo` membaca dari `saldo_log` (baru) DAN `topup_saldo`/`topup_saldo_guru` (legacy), merge, lalu deduplikasi sebelum ditampilkan.

6. **CSS admin dimuat global** — `layout.js` root mengimpor CSS admin-specific secara global, artinya file CSS admin ikut di-load untuk semua user.

7. **Route siswa di root path** — `(siswa)` adalah route group sehingga path siswa ada di `/dashboard`, `/beli-produk`, dll — bukan `/siswa/dashboard`.
