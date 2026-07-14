# 📚 ALBA APPS - Copilot Development Guide

Dokumentasi lengkap sistem manajemen koperasi sekolah Alba Apps yang dibangun dengan Next.js 16, React 19, dan Supabase.

---

## 🎯 Gambaran Umum Proyek

**Alba Apps** adalah sistem manajemen koperasi sekolah yang komprehensif dengan fitur **self-service pembelian, manajemen hutang, dan tracking saldo** untuk siswa dan guru. Sistem ini memungkinkan pengguna membeli produk, melacak hutang, dan melihat riwayat saldo mereka secara real-time.

**Status**: ✅ Fitur core selesai (self-service, hutang, saldo)

---

## 📊 Tumpukan Teknologi

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16.2.9 (App Router) |
| **UI Library** | React 19.2.4 |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Cookie-based sessions (HMAC-SHA256) |
| **State Management** | React Hooks + Custom Hooks |
| **Charts** | Recharts 2.9.0 |
| **Forms** | React Select 5.10.2 |
| **Notifications** | React Hot Toast 2.6.0 |
| **Linting** | ESLint 9 |
| **Styling** | Native CSS (no frameworks) |

---

## 🗂️ Struktur Folder

```
src/
├── app/                           # Next.js App Router pages
│   ├── (auth)/                    # Public auth routes
│   │   └── login/
│   ├── (admin)/                   # Admin-only routes
│   │   ├── admin/
│   │   ├── produk/
│   │   ├── user/
│   │   ├── hutang/
│   │   ├── order-siswa/
│   │   ├── order-guru/
│   │   ├── topup-saldo/
│   │   ├── kasir/
│   │   ├── AdminSidebar.jsx
│   │   └── layout.js
│   ├── (siswa)/                   # Student self-service
│   │   ├── dashboard/
│   │   ├── beli-produk/           # ✅ Shopping + Order
│   │   ├── hutang-saya/           # ✅ Debt Management
│   │   ├── saldo/                 # ✅ Balance Tracking
│   │   ├── settings/
│   │   ├── SiswaSidebar.jsx
│   │   └── layout.js
│   ├── guru/                      # Teacher self-service
│   │   ├── dashboard/
│   │   ├── beli-produk/
│   │   ├── hutang-saya/
│   │   ├── saldo/
│   │   ├── profile/
│   │   ├── GuruSidebar.jsx
│   │   └── layout.js
│   ├── pengurus/                  # Manager oversight
│   │   ├── laporan/               # ✅ Reports & Analytics
│   │   └── layout.js
│   ├── shared/                    # Shared CSS
│   │   ├── dashboard.css
│   │   ├── hutang.css
│   │   ├── saldo.css
│   │   └── hutang-table.css
│   └── api/                       # Server-side API routes
│       ├── auth/
│       │   ├── login/
│       │   ├── logout/
│       │   └── change-password/
│       ├── orders/
│       │   ├── create/
│       │   ├── confirm/
│       │   └── reject/
│       ├── topup-saldo/
│       ├── payment-hutang/
│       └── guru/
│           └── auto-topup/
├── components/                    # Reusable UI components
│   ├── Loading.jsx
│   ├── PasswordChangeForm.jsx
│   ├── ProfileInfoCard.jsx
│   └── ToastProvider.jsx
├── hooks/                         # Custom React hooks
│   ├── useHutang.js              # Debt data + payment
│   ├── useSaldo.js               # Balance data + history
│   ├── useStudent.js
│   ├── useStudentProfile.js
│   ├── useTeacher.js
│   ├── useTeacherProfile.js
│   └── useRequireAuth.js
└── utils/                         # Helper utilities
    ├── api.js                    # Response helpers
    ├── auth.js                   # Client-side auth
    ├── hutang.js                 # Debt helpers
    ├── saldo.js                  # Balance helpers
    ├── session.js                # Server-side session
    ├── supabase.js               # Client Supabase
    └── supabase-server.js        # Server Supabase
```

---

## 🗄️ Database Schema

### **Struktur: 6 Tabel Baru + 6 Tabel Legacy (Total 12 Tabel)**

Sistem menggunakan **2 generasi tabel**:
- **Tabel Baru (Unified)**: Untuk fitur modern (transaksi, saldo_log)
- **Tabel Legacy**: Masih digunakan untuk backward compatibility
- **Hooks Deduplication**: `useHutang()` dan `useSaldo()` otomatis merge keduanya

---

### **TABEL BARU (6 Tabel)**

#### **1. siswa** - User Siswa
```sql
nis              INT PRIMARY KEY
nama_siswa       TEXT NOT NULL
kelas            TEXT NOT NULL
password         TEXT NOT NULL
total_hutang     INT DEFAULT 0 (total hutang terutang)
saldo            INT DEFAULT 0 (saldo tersedia)
```

#### **2. guru** - User Guru
```sql
nip              INT PRIMARY KEY
nama_guru        TEXT NOT NULL
bidang_studi     TEXT NOT NULL
password         TEXT NOT NULL
total_hutang     INT DEFAULT 0
saldo            INT DEFAULT 0
```

#### **3. produk** - Inventory
```sql
id               SERIAL PRIMARY KEY
nama_produk      TEXT NOT NULL
harga_beli       INT NOT NULL
harga_jual       INT NOT NULL
stok             INT NOT NULL
created_at       TIMESTAMP DEFAULT NOW()
```

#### **4. transaksi** - Unified Transaction Log
```sql
id               TEXT PRIMARY KEY (format: "type_userid_timestamp")
created_at       TIMESTAMP DEFAULT NOW()
customer_type    'siswa' | 'guru'
nis_siswa        INT REFERENCES siswa(nis)
nip_guru         INT REFERENCES guru(nip)
transaction_type 'purchase' | 'order' | 'topup' | 'hutang_payment' | 'refund'
payment_method   'Tunai' | 'QRIS' | 'Saldo' | 'Hutang' | 'Transfer'
payment_status   'Lunas' | 'Belum Lunas' | 'Partial' | 'Dibatalkan'
order_status     'Menunggu' | 'Dikonfirmasi' | 'Ditolak' | 'Selesai' (only for orders)
amount_total     INT (total amount)
amount_paid      INT (amount already paid)
amount_due       INT (amount still owed)
note             TEXT (optional payment notes)
metadata         JSONB (extra context)
```

#### **5. detail_transaksi** - Transaction Items
```sql
id               SERIAL PRIMARY KEY
transaksi_id     TEXT REFERENCES transaksi(id)
produk_id        INT REFERENCES produk(id)
jumlah           INT (quantity)
harga_satuan     INT (unit price)
sub_total        INT (jumlah × harga_satuan)
```

#### **6. saldo_log** - Balance History Audit
```sql
id               SERIAL PRIMARY KEY
created_at       TIMESTAMP DEFAULT NOW()
customer_type    'siswa' | 'guru'
nis_siswa        INT REFERENCES siswa(nis)
nip_guru         INT REFERENCES guru(nip)
transaksi_id     TEXT REFERENCES transaksi(id)
log_type         'Top-up' | 'Order_Saldo' | 'Hutang_Payment' | 'Refund' | 'Adjustment'
amount           INT (perubahan saldo, bisa positif atau negatif)
balance_before   INT (saldo sebelum transaksi)
balance_after    INT (saldo sesudah transaksi)
payment_method   'Tunai' | 'QRIS' | 'Saldo' | 'Hutang' | 'Transfer'
note             TEXT
```

---

### **TABEL LEGACY (6 Tabel - Masih Digunakan)**

Tabel-tabel berikut masih aktif untuk backward compatibility dan data historis:

#### **7. order_siswa** - Pesanan Siswa (Legacy)
```sql
id               SERIAL PRIMARY KEY
nis              INT REFERENCES siswa(nis)
status_order     'Menunggu' | 'Dikonfirmasi' | 'Ditolak' | 'Selesai'
total_harga      INT
tanggal_order    TIMESTAMP
metode_pembayaran 'Saldo' | 'Hutang'
catatan          TEXT
```

#### **8. order_guru** - Pesanan Guru (Legacy)
```sql
id               SERIAL PRIMARY KEY
nip              INT REFERENCES guru(nip)
status_order     'Menunggu' | 'Dikonfirmasi' | 'Ditolak' | 'Selesai'
total_harga      INT
tanggal_order    TIMESTAMP
metode_pembayaran 'Saldo' | 'Hutang'
catatan          TEXT
```

#### **9. detail_order_siswa** - Detail Pesanan Siswa (Legacy)
```sql
id               SERIAL PRIMARY KEY
order_id         INT REFERENCES order_siswa(id)
produk_id        INT REFERENCES produk(id)
jumlah           INT
harga_satuan     INT
sub_total        INT
```

#### **10. detail_order_guru** - Detail Pesanan Guru (Legacy)
```sql
id               SERIAL PRIMARY KEY
order_id         INT REFERENCES order_guru(id)
produk_id        INT REFERENCES produk(id)
jumlah           INT
harga_satuan     INT
sub_total        INT
```

#### **11. topup_saldo** - History Top-up Siswa (Legacy)
```sql
id               SERIAL PRIMARY KEY
nis              INT REFERENCES siswa(nis)
nominal          INT
metode           TEXT
catatan          TEXT
tanggal          TIMESTAMP DEFAULT NOW()
```

#### **12. topup_saldo_guru** - History Top-up Guru (Legacy)
```sql
id               SERIAL PRIMARY KEY
nip              INT REFERENCES guru(nip)
nominal          INT
metode           TEXT
catatan          TEXT
tanggal          TIMESTAMP DEFAULT NOW()
```

---

### **Strategi Migrasi Data**

**Current Approach: Dual-Read (Deduplication)**

Hooks `useHutang()` dan `useSaldo()` automatically merge:
```javascript
// useHutang()
- Reads dari: transaksi table (new) + order_siswa/order_guru (legacy)
- Deduplicates automatically
- Returns unified history

// useSaldo()
- Reads dari: saldo_log (new) + topup_saldo/topup_saldo_guru (legacy)
- Merges & normalizes both sources
- Returns single consistent view
```

**Benefits:**
✅ Zero data loss
✅ Backward compatible
✅ No downtime migration needed
✅ Can migrate gradually when ready

**Future Plan (Optional):**
- [ ] Data migration script: legacy → new tables
- [ ] Deprecate legacy tables (keep for archive)
- [ ] Single source of truth (transaksi + saldo_log only)

---

## 🔐 Autentikasi & Otorisasi

### **4 Role Berbeda**

| Role | Akses | Fitur |
|------|-------|-------|
| **admin** | `/admin/*` | Full CRUD: users, products, orders, reports |
| **pengurus** | `/pengurus/*` | Oversight: reports, analytics, CSV export |
| **guru** | `/guru/*` | Self-service: buy, pay debt, check balance, auto-topup |
| **siswa** | `/dashboard`, `/(siswa)/*` | Self-service: buy, pay debt, check balance |

### **Session Management**
```javascript
// Server-side: Cookie HMAC-SHA256 signed
Cookie Name: koperasi_session
Cookie Options: HttpOnly, SameSite=Strict, Secure (https only in production)

// Client-side: Safe metadata only in localStorage
localStorage keys: ['role', 'username', 'nis', 'nip', 'nama', 'kelas', 'bidang_studi']

// Validation
- useRequireAuth(requiredRole) checks role on every protected layout
- Mismatch → redirect to login automatically
```

### **Password Security Notes**
- ⚠️ Passwords currently stored as **plain text** in DB (needs bcrypt/scrypt in production)
- Login endpoint: validates `identifier` (NIS/NIP/username) + `password` match
- Change password: validates `currentPassword`, `newPassword`, `confirmPassword`

---

## ✨ Fitur-Fitur yang Selesai

### **1. 🛒 BELI PRODUK (Self-Service Purchase)**
**Routes**: `(siswa)/beli-produk`, `guru/beli-produk`

**Features**:
- ✅ Browse semua produk dengan search
- ✅ Shopping cart system (add/remove items)
- ✅ Stock validation sebelum order
- ✅ 2 payment methods: **Saldo** (top-up terlebih dahulu), **Hutang** (cicilan)
- ✅ Balance check (cegah overselling pada saldo purchases)
- ✅ Order submission → admin must confirm
- ✅ Recent orders display (10 items terakhir)
- ✅ Order history tracking

**Flow**:
```
User memilih produk → Add to cart → Set metode pembayaran 
→ Submit order → Admin konfirmasi → Stock berkurang, hutang/saldo update
```

**API**: `POST /api/orders/create`
```javascript
Body: {
  userType: 'siswa' | 'guru',
  userId: nis | nip,
  items: [{ produk_id, jumlah }, ...],
  metode_pembayaran: 'Saldo' | 'Hutang'
}
Returns: { success: true, orderId, ... }
```

---

### **2. 💳 MANAJEMEN HUTANG (Debt Tracking & Payment)**
**Routes**: `(siswa)/hutang-saya`, `guru/hutang-saya`

**Features**:
- ✅ Display total hutang real-time dari `siswa/guru.total_hutang`
- ✅ Unified hutang history (orders + debt transactions):
  - Hutang orders: Menunggu → Dikonfirmasi → Selesai
  - Debt payments: Lunas, Belum Lunas, Partial
  - Refunds: ketika order ditolak
- ✅ Smart status badges: "Hutang Pending", "Sudah Dibayar", "Ditolak", etc.
- ✅ Payment form dengan validation:
  - `amount <= total_hutang`
  - `saldo >= amount` (cegah payment tanpa saldo)
- ✅ Manual debt payment: gunakan saldo untuk bayar hutang
- ✅ Formatted amounts & dates

**Data Sources**:
- `transaksi` table (new unified)
- Legacy `order_siswa`/`order_guru` (still works)
- Hooks `useHutang()` deduplicate antara keduanya

**API**: `POST /api/payment-hutang`
```javascript
Body: {
  userType: 'siswa' | 'guru',
  userId: nis | nip,
  amount: number,
  paymentMethod: 'Saldo' | 'Tunai' | 'Transfer' // dst
}
Returns: { success: true, newHutang, newSaldo, ... }
```

---

### **3. 💰 SALDO TRACKING (Balance Management)**
**Routes**: `(siswa)/saldo`, `guru/saldo`

**Features**:
- ✅ Real-time balance display: `siswa/guru.saldo`
- ✅ Complete transaction history dengan timestamps:
  - Top-up saldo (admin initiated): "Top-up saldo via Transfer • catatan khusus"
  - Pembelian dengan saldo: "Pembelian produk menggunakan saldo"
  - Pelunasan hutang: "Pelunasan hutang dari saldo"
  - Refund (order rejected): "Refund - Saldo dikembalikan karena order ditolak"
- ✅ Balance before/after tracking untuk audit
- ✅ Automatic deduplication (merges `saldo_log` + legacy `topup_saldo` tables)

**Data Flow**:
```
Admin top-up → saldo_log entry → saldo column updated
User buys → saldo_log entry + saldo decrement
User pays hutang → saldo_log entry + saldo decrement
```

**Auto-Topup Guru** (monthly):
- Bonus Rp 50,000 per bulan
- One-per-month check (prevent duplicate)
- Auto-logged to saldo history

**API**: `POST /api/topup-saldo` (admin only)
```javascript
Body: {
  userType: 'siswa' | 'guru',
  userId: nis | nip,
  amount: number,
  metode: 'Tunai' | 'QRIS' | 'Transfer',
  note: 'optional notes'
}
```

---

### **4. 📊 ADMIN DASHBOARD (Analytics)**
**Route**: `/admin/dashboard`

**Ringkasan Penjualan - Period Filter:**

Dashboard sekarang support **4 periode berbeda** dengan auto-accumulation metrics:

**Periode:**
- 🗓️ **1 Minggu Terakhir** (7 days) - default
- 📅 **1 Bulan Terakhir** (30 days)
- 📊 **1 Tahun Terakhir** (365 days)
- 🕐 **Semua Waktu** (no filter)

**Metrics yang di-display (auto-update saat ganti periode):**

| Metric | Definisi | Formula | Data Source |
|--------|----------|---------|-------------|
| **Omzet** | Total revenue dari semua transaksi selesai | SUM(transaksi.amount_total) | transaksi (new) + order_siswa/guru (legacy) |
| **Item Terjual** | Total quantity/jumlah barang terjual | SUM(detail_transaksi.jumlah) | detail_transaksi (new) + detail_order_siswa/guru (legacy) |
| **Transaksi** | Total count pesanan yang dikonfirmasi | COUNT(DISTINCT transaksi.id) | transaksi (new) + order_siswa/guru (legacy) |
| **Laba Kotor** | Omzet - Harga Pokok | SUM(harga_jual × qty) - SUM(harga_beli × qty) | detail_transaksi + produk (new) + detail_order + produk (legacy) |

**Metrics Tambahan (Derived):**
- **Estimasi Laba Bersih**: Laba Kotor × 90%
- **Rata-rata Per Transaksi**: Omzet ÷ Total Transaksi

**Implementasi Hook:**
```javascript
// Use in component:
const summary = useDashboardSummary(period);
// Returns: {
//   omzet, itemTerjual, totalTransaksi, labaKotor,
//   avgOrderValue, estimasiLabaBersih,
//   loading, error, periodLabel, dateRange
// }
```

**Fitur Tambahan:**
- ✅ Real-time period switching dengan loading state
- ✅ Auto-merge data dari tabel baru + legacy (backward compatible)
- ✅ Date range calculation automatic
- ✅ Deduplication untuk mencegah double-counting

---

### **5. 👥 USER MANAGEMENT (Admin)**
**Route**: `/admin/user`

**Features**:
- ✅ Create siswa/guru (NIS/NIP, nama, kelas/bidang studi, password)
- ✅ Edit profile info
- ✅ View total hutang per user (real-time from DB)
- ✅ Search & filter by user type
- ✅ Summary stats (total siswa, total guru)

---

### **6. 📦 PRODUK MANAGEMENT (Admin)**
**Route**: `/admin/produk`

**Features**:
- ✅ Add new products (nama, harga_beli, harga_jual, stok)
- ✅ Edit stock levels inline
- ✅ Search products
- ✅ **CSV Import**: Download template → Edit in Excel → Upload
  - Auto-parses CSV, creates/updates products
  - Validation per row
- ✅ Stock validation (prevent negative)

---

### **7. 📋 ORDER MANAGEMENT (Admin)**
**Routes**: `/admin/order-siswa`, `/admin/order-guru`

**Features**:
- ✅ List all pending orders (status = "Menunggu")
- ✅ **Confirm order**:
  - Deduct stock from `produk.stok`
  - Update `siswa/guru.total_hutang` if payment method is "Hutang"
  - Update `siswa/guru.saldo` if payment method is "Saldo"
  - Create transaksi with status "Dikonfirmasi"
- ✅ **Reject order**:
  - Refund saldo if applicable
  - Keep hutang record for reference
  - Status → "Ditolak"
- ✅ View order details with product breakdown
- ✅ Order stats: total, pending, confirmed, rejected

---

### **8. 💸 TOPUP SALDO (Admin)**
**Route**: `/admin/topup-saldo`

**Features**:
- ✅ Admin top-up untuk siswa/guru
- ✅ Payment method options: Transfer, Tunai, QRIS, dll
- ✅ Optional notes/catatan
- ✅ Auto-logged to `saldo_log` dengan balance tracking

---

### **9. 📊 LAPORAN (Pengurus/Manager)**
**Route**: `/pengurus/laporan`

**Features**:
- ✅ Filter: Hari Ini / Bulan Ini
- ✅ Summary cards:
  - Total Omzet (revenue)
  - Total Transaksi (count)
  - Total Order Dikonfirmasi
  - Total Hutang Pending
- ✅ Revenue chart by date (line chart)
- ✅ Full transaction list:
  - Type (purchase, order, topup, hutang_payment, refund)
  - Date, amount, status
  - Searchable & filterable
- ✅ **CSV Export**: Full report dengan header, summary, detail rows

---

### **10. ⚙️ USER SETTINGS (Self-Service)**
**Routes**: `(siswa)/settings`, `guru/profile`

**Features**:
- ✅ View profile info: nama, ID (NIS/NIP), kelas/bidang studi, saldo, hutang
- ✅ Change password:
  - Validate: `currentPassword` matches
  - `newPassword === confirmPassword`
  - Min 6 characters
  - Display success/error messages

**API**: `POST /api/auth/change-password`
```javascript
Body: {
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
}
```

---

## 🔗 API Endpoints (Complete)

### **Authentication**
```
POST /api/auth/login
  Body: { identifier: string, password: string }
  identifier: NIS, NIP, atau username admin/pengurus
  Returns: { success: true, session: {...} }
  Sets: koperasi_session cookie

POST /api/auth/logout
  Returns: { success: true }
  Clears: koperasi_session cookie

POST /api/auth/change-password
  Requires: Valid session cookie
  Body: { currentPassword, newPassword, confirmPassword }
  Returns: { success: true }
```

### **Orders**
```
POST /api/orders/create
  Body: {
    userType: 'siswa' | 'guru',
    userId: nis | nip,
    items: [{ produk_id, jumlah }, ...],
    metode_pembayaran: 'Saldo' | 'Hutang'
  }
  Validates: Stock available, balance sufficient
  Returns: { success: true, orderId, total_amount }

POST /api/orders/confirm
  Body: {
    orderId: string,
    userType: 'siswa' | 'guru'
  }
  Updates: Stock, hutang/saldo, transaksi status
  Returns: { success: true, newStock, newHutang, ... }

POST /api/orders/reject
  Body: {
    orderId: string,
    userType: 'siswa' | 'guru'
  }
  Refunds: Saldo jika diperlukan
  Returns: { success: true, refundedAmount }
```

### **Balance & Debt**
```
POST /api/topup-saldo
  Body: {
    userType: 'siswa' | 'guru',
    userId: nis | nip,
    amount: number,
    metode: 'Transfer' | 'Tunai' | 'QRIS' | ...,
    note: string (optional)
  }
  Requires: Admin session
  Updates: saldo, saldo_log entry
  Returns: { success: true, newBalance }

POST /api/payment-hutang
  Body: {
    userType: 'siswa' | 'guru',
    userId: nis | nip,
    amount: number,
    paymentMethod: string
  }
  Validates: amount <= total_hutang, balance sufficient
  Updates: total_hutang, saldo, transaksi, saldo_log
  Returns: { success: true, newHutang, newSaldo }
```

### **Special**
```
POST /api/guru/auto-topup
  Requires: Guru session
  Effect: +Rp 50,000 bonus, max once per month
  Returns: { success: true, newBalance, message }
```

---

## 🪝 Custom Hooks (Complete Reference)

### **useHutang({ role, initialFetch = true })**
Manages debt data and payment for siswa/guru.

```javascript
// Returns object:
{
  // Data
  profile,              // { nis/nip, nama, total_hutang, saldo, ... }
  history,              // Array of debt transactions (unified)
  
  // Form state
  paymentAmount,        // Input value
  setPaymentAmount,     // Setter
  
  // States
  loading,              // Initial fetch loading
  error,                // Fetch error message
  processingPayment,    // Payment in-progress
  paymentError,         // Payment error message
  paymentSuccess,       // Payment success message
  
  // Methods
  handlePayHutang,      // async (amount) => Promise<result>
}

// Data sources:
// - transaksi table (new)
// - Legacy order_siswa/order_guru tables
// - Hooks deduplicate automatically
```

### **useSaldo({ role, initialFetch = true })**
Manages balance data and history for siswa/guru.

```javascript
{
  // Data
  profile,                      // { nis/nip, saldo, nama, ... }
  historyItems,                 // Normalized array of transactions
  
  // States
  loading,
  errorMessage,
  
  // Methods
  refresh,                      // () => Promise (manual fetch)
  config,                       // Role-specific configuration
  formatHistoryDescription,     // (item) => string (formatted label)
}

// Features:
// - Merges saldo_log + legacy topup_saldo tables
// - Smart description formatting: "Top-up saldo via Transfer • catatan"
// - Deduplication (removes duplicates)
```

### **useStudent()**
Fetches current student data.

```javascript
{
  student,              // { nis, nama_siswa, kelas, saldo, total_hutang, ... }
  transactions,         // Array of transaksi
  activeNis,            // Current NIS from session
  loading,
  error,
  refresh,              // Manual refetch
}
```

### **useStudentProfile()**
Fetches student profile only (lighter weight).

```javascript
{
  student,
  loading,
  error,
  refresh,
}
```

### **useTeacher()**
Fetches current teacher data.

```javascript
{
  teacher,              // { nip, nama_guru, bidang_studi, saldo, total_hutang, ... }
  orders,               // Array of orders
  transactions,         // Array of transaksi
  activeNip,            // Current NIP from session
  loading,
  error,
  refresh,
}
```

### **useTeacherProfile()**
Fetches teacher profile only.

```javascript
{
  teacher,
  loading,
  error,
  refresh,
}
```

### **useRequireAuth(requiredRole)**
Validates user role on protected layouts.

```javascript
{
  loading,              // Session check in progress
  handleLogout,         // () => void (logout function)
}

// Usage in layout:
useRequireAuth('siswa');  // Redirects to /login if not siswa
useRequireAuth('guru');   // Redirects if not guru
useRequireAuth('admin');  // Redirects if not admin

// Automatically:
// - Reads session from localStorage
// - Compares with requiredRole
// - Redirects to /login if mismatch
// - Shows loading while checking
```

### **useDashboardSummary(period = '1_week')**
Accumulates sales metrics with period filter support (new hook).

```javascript
// Supported periods:
const PERIOD_OPTIONS = {
  '1_week': { label: '1 Minggu Terakhir', days: 7 },
  '1_month': { label: '1 Bulan Terakhir', days: 30 },
  '1_year': { label: '1 Tahun Terakhir', days: 365 },
  'all_time': { label: 'Semua Waktu', days: null }
}

// Usage:
const summary = useDashboardSummary('1_week');

// Returns:
{
  // Primary metrics
  omzet,                 // Total revenue (Rp)
  itemTerjual,           // Total items sold (qty)
  totalTransaksi,        // Transaction count
  labaKotor,             // Gross profit (Rp)
  
  // Derived metrics
  avgOrderValue,         // omzet ÷ totalTransaksi
  estimasiLabaBersih,    // labaKotor × 0.9
  
  // Meta
  loading,               // Fetch in progress
  error,                 // Error message
  period,                // Active period key
  dateRange,             // { start: Date, end: Date }
  periodLabel,           // Human-readable period label
}

// Features:
// - Auto-merge data from new tables (transaksi, detail_transaksi)
//   and legacy tables (order_siswa, detail_order_siswa, etc)
// - Date range auto-calculated from period
// - Deduplication to prevent double-counting
// - All metrics auto-update when period changes
```

---

## 🛠️ Utility Helpers (Complete Reference)

### **auth.js** - Client-side Auth
```javascript
saveAuthSession(user)           // localStorage.setItem
getAuthSession()                // localStorage.getItem + parse
getRoleSession(role)            // Get session if role matches
clearAuthSession()              // localStorage cleanup on logout
getRedirectRouteByRole(role)    // Returns: /admin, /guru, /dashboard, /pengurus
```

### **hutang.js** - Debt Formatting
```javascript
getHutangLabel(item)            // "Hutang Pending", "Sudah Dibayar", "Ditolak"
getHutangStatusClass(item)      // CSS class for styling (pending, success, danger)
```

### **saldo.js** - Balance Formatting
```javascript
mapSaldoHistoryRow(item)        // Normalize both saldo_log and legacy topup rows
formatHistoryDescription(item)  // Smart description based on log_type:
                                // "Top-up saldo via Transfer • catatan"
                                // "Pembelian produk menggunakan saldo"
                                // "Pelunasan hutang dari saldo"
                                // "Refund - Saldo dikembalikan..."

saldoRoleConfig                 // Object with role-specific table/field names
                                // Example: siswa → queries from siswa table
                                //          guru → queries from guru table
```

### **session.js** - Server-side Sessions (HMAC-SHA256)
```javascript
createSessionToken(session)     // Sign session object → encrypted token
parseSessionToken(token)        // Verify & decode token
getSessionFromCookieHeader(req) // Extract from Authorization header
createSessionCookie(session)    // Generate Set-Cookie header
clearSessionCookie()            // Generate clear-cookie response
```

Cookie format:
```
koperasi_session=<hmac-signed-token>; HttpOnly; SameSite=Strict; Path=/; 
```

### **api.js** - Response Helpers
```javascript
jsonSuccess(data, status = 200, headers = {})
  // Returns: { success: true, ...data }
  // Example: jsonSuccess({ orderId: 123 })

jsonError(error, status = 400, headers = {})
  // Returns: { success: false, error: "message" }
  // Example: jsonError("Insufficient balance", 400)
```

---

## 📦 Reusable Components

| Component | Purpose | Props |
|-----------|---------|-------|
| **Loading.jsx** | Spinner indicator | `message?: string`, `size?: string` |
| **PasswordChangeForm.jsx** | Password form | `onSubmit: func`, `title?: string`, `submitLabel?: string` |
| **ProfileInfoCard.jsx** | Profile display | `title: string`, `fields: array`, `loading?: bool`, `emptyMessage?: string` |
| **ToastProvider.jsx** | Toast wrapper | (children) |

### Usage Examples

```javascript
// Loading
<Loading message="Memproses pembayaran..." size="lg" />

// Password form
<PasswordChangeForm 
  onSubmit={handlePasswordChange}
  title="Ganti Password"
  submitLabel="Perbarui"
/>

// Profile card
<ProfileInfoCard 
  title="Informasi Siswa"
  fields={[
    { label: 'Nama', value: student.nama },
    { label: 'Kelas', value: student.kelas },
    { label: 'Saldo', value: `Rp ${student.saldo}` }
  ]}
  loading={loading}
  emptyMessage="Data tidak ditemukan"
/>
```

---

## 📋 Konvensi Pengkodean

### **Penamaan**
```javascript
// Components: PascalCase
MyComponent.jsx

// Hooks: useSomething
useHutang()

// Utils: camelCase
formatHistoryDescription()

// Constants: UPPER_SNAKE_CASE
ROLE_ADMIN, PAYMENT_STATUS_LUNAS

// Database fields: snake_case
total_hutang, nis_siswa, metode_pembayaran

// Frontend state/variables: camelCase
isLoading, paymentAmount, totalHutang
```

### **Struktur File Komponen**
```javascript
'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import styles from './component.module.css';

export default function MyComponent() {
  useRequireAuth('siswa');
  
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Data fetch
  }, []);
  
  return <div className={styles.container}>{/* ... */}</div>;
}
```

### **Standar API Route**
```javascript
// src/app/api/endpoint/route.js

import { createServerClient } from '@/utils/supabase-server';
import { jsonSuccess, jsonError } from '@/utils/api';
import { getSessionFromCookieHeader } from '@/utils/session';

export async function POST(request) {
  try {
    // 1. Get session
    const { headers } = request;
    const session = getSessionFromCookieHeader(headers);
    if (!session) return jsonError('Unauthorized', 401);
    
    // 2. Validate input
    const body = await request.json();
    if (!body.required_field) {
      return jsonError('Missing required_field', 400);
    }
    
    // 3. Database operation
    const supabase = createServerClient();
    const { data, error } = await supabase.from('table_name').insert([...]);
    if (error) return jsonError(error.message, 500);
    
    // 4. Return success
    return jsonSuccess({ data });
  } catch (error) {
    return jsonError(error.message, 500);
  }
}
```

---

## ✅ Aturan Pengembangan

### **Komponen**
- ✅ Komponen harus kecil, fokus, dan single-responsibility
- ✅ Jika logic fetch data diulang, ekstrak ke custom hook di `src/hooks`
- ✅ Gunakan `Loading` component untuk loading state
- ✅ Hindari logika JSX kompleks; ekstrak ke helper/hook
- ✅ Reuse `PasswordChangeForm`, `ProfileInfoCard`, `ToastProvider` bila memungkinkan

### **API Routes**
- ✅ Selalu validasi input sebelum database operation
- ✅ Gunakan `createServerClient()` untuk database di server-side saja
- ✅ Jangan expose `SUPABASE_SERVICE_KEY` ke browser (use `NEXT_PUBLIC_` hanya untuk public keys)
- ✅ Selalu error-check hasil Supabase: `if (error) return jsonError(...)`
- ✅ Return consistent format: `{ success: true, ... }` or `{ success: false, error: "..." }`

### **Database**
- ✅ **New Tables** (prioritas): Gunakan `transaksi` + `detail_transaksi` untuk semua order baru
- ✅ **Balance Audit**: Semua perubahan saldo log ke `saldo_log` (mandatory)
- ✅ **Legacy Support**: Hooks otomatis merge legacy data untuk backward compatibility
- ✅ Maintain `siswa.total_hutang` dan `siswa.saldo` selalu sync dengan DB
- ✅ Cek constraints: `total_hutang >= 0`, `saldo >= 0`, stock balance
- ✅ Deduplicate pada hooks (merge transaksi + order_siswa, saldo_log + topup_saldo)

### **State Management**
- ✅ Gunakan `useState` + `useEffect` di komponen
- ✅ Extract repeated logic ke custom hook
- ✅ `localStorage` hanya untuk non-sensitive session metadata
- ✅ Fetch authenticated data di route API, bukan browser

### **Styling**
- ✅ Gunakan native CSS (no Tailwind, no CSS-in-JS)
- ✅ Shared styles di `src/app/shared`
- ✅ Component-specific styles di module files (`.module.css`)
- ✅ Responsive design dengan media queries

---

## 🔐 Keamanan

### **Current Status**
- ✅ Session: HMAC-SHA256 signed cookies (HttpOnly, SameSite)
- ✅ API: Role-based access control via session
- ✅ Database: Row-level security via session check
- ⚠️ **Password hashing**: Currently plain-text (needs bcrypt/scrypt)
- ✅ Form validation: Client + server-side

### **Best Practices**
- ✅ Never expose `SUPABASE_SERVICE_KEY` to browser
- ✅ Validate all inputs (length, type, range)
- ✅ Check session role on every protected endpoint
- ✅ Use HTTPS in production (enforce Secure cookie flag)
- ✅ Rate limit API endpoints to prevent abuse

### **Future Improvements**
- [ ] Hash passwords with bcrypt/scrypt
- [ ] Implement JWT tokens with expiration
- [ ] Add audit logging for sensitive operations
- [ ] Implement 2FA for admin users
- [ ] Add request rate limiting

---

## 📐 Accessibility

- ✅ Semantic HTML: `button`, `table`, `label`, `input`
- ✅ Forms: `<label htmlFor>` linked to inputs
- ✅ Modals: `role="dialog"`, `aria-modal="true"`
- ✅ Keyboard navigation: All interactive elements focusable
- ✅ Color contrast: Text readable on background

---

## 📝 CSS Konvensi

```css
/* Shared styles */
src/app/shared/dashboard.css
src/app/shared/hutang.css
src/app/shared/saldo.css

/* Component-specific */
src/app/(siswa)/beli-produk/beli-produk.css
src/app/(siswa)/hutang-saya/hutang-saya.css

/* Naming */
.container { /* outer wrapper */ }
.header { /* section header */ }
.card { /* card component */ }
.button { /* button styles */ }
.error { /* error state */ }
.loading { /* loading state */ }
```

---

## 🧪 Testing Guidelines

- ✅ Test auth flow: login, logout, session validation
- ✅ Test order flow: create → confirm → stock deduction
- ✅ Test payment flow: hutang payment, saldo deduction
- ✅ Test role-based access: wrong role → redirect
- ✅ Test edge cases: overselling, insufficient balance, invalid input

---

## 🚀 Deployment Notes

- ✅ Environment variables: `.env.local` (never commit)
- ✅ Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- ✅ Build: `npm run build` → `npm start`
- ✅ Database: Ensure schema is migrated (run `db-struktur-sql.md`)
- ✅ HTTPS: Enable in production for HttpOnly cookies

---

## 📚 Struktur Lengkap yang Sudah Dikerjakan

✅ **Self-Service Features**
- Shopping cart dengan order confirmation
- Debt tracking dan payment
- Balance history dengan audit trail

✅ **Admin Features**
- User management (create, edit, delete)
- Product inventory management
- Order confirmation/rejection
- Balance top-up
- Dashboard analytics

✅ **Manager Features**
- Revenue reports
- Transaction history
- CSV export

✅ **Authentication**
- Role-based access control
- Session management
- Password change

✅ **Database**
- Unified transaction log
- Balance audit trail
- Foreign key relationships
- Constraint validation

---

## 💡 Catatan Penting

1. **Deduplication**: Hooks `useHutang` dan `useSaldo` otomatis merge data dari tabel baru (`transaksi`, `saldo_log`) dan legacy tables. Ini memastikan backward compatibility.

2. **Balance Consistency**: Setiap transaksi yang mengubah saldo harus membuat entry di `saldo_log` dengan `balance_before` dan `balance_after` untuk audit trail.

3. **Order Status**: Orders memiliki 2 status: `order_status` (lifecycle) dan `payment_status` (payment progress).

4. **Metadata**: Field `metadata` di `transaksi` tersedia untuk extra context (e.g., promo code, reference number).

5. **Testing Data**: Lihat `db-struktur-sql.md` untuk seed data minimal (1 siswa, 1 guru, 5 produk).

---

**Last Updated**: 2026-07-14  
**Status**: ✅ Core features complete, ready for production refinement
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
