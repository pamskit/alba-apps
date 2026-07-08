# Alba Apps - Implementasi Flow Transaksi & Hutang

## 📋 Ringkasan Implementasi
Implementasi lengkap untuk flow pembelian produk (tunai/QRIS/hutang/saldo), topup saldo, dan pembayaran hutang dengan tracking riwayat yang komprehensif.

---

## ✅ Yang Telah Diselesaikan

### 1. **API Routes** (Backend Logic)

#### `/api/orders/create` - Buat Order Self-Service
**Purpose:** Siswa/Guru membeli produk dengan saldo atau hutang
```
POST /api/orders/create
Body: {
  userType: "siswa" | "guru",
  userId: nis | nip,
  items: [{ produk_id, jumlah }, ...],
  metode_pembayaran: "Saldo" | "Hutang"
}

Response: {
  success: true,
  orderId: "order_...",
  totalHarga: 50000,
  message: "Order berhasil dibuat..."
}
```

**Logic:**
- ✅ Validasi user & produk
- ✅ Cek stok produk
- ✅ Jika Saldo: kurangi saldo langsung + log transaksi
- ✅ Jika Hutang: buat order pending (hutang ditambah saat admin konfirmasi)
- ✅ Hitung total harga

#### `/api/orders/confirm` - Admin Konfirmasi Order
**Purpose:** Admin approve order (update stok, saldo/hutang, log transaksi)
```
POST /api/orders/confirm
Body: { orderId, userType: "siswa" | "guru" }

Response: {
  success: true,
  message: "Order berhasil dikonfirmasi"
}
```

**Logic:**
- ✅ Update stok produk (kurangi sesuai jumlah order)
- ✅ Jika metode Saldo: update saldo log
- ✅ Jika metode Hutang: tambah total_hutang + log transaksi
- ✅ Update order status ke "Dikonfirmasi"

#### `/api/orders/reject` - Admin Tolak Order
**Purpose:** Admin reject order (refund saldo jika perlu)
```
POST /api/orders/reject
Body: { orderId, userType: "siswa" | "guru" }

Response: {
  success: true,
  message: "Order berhasil ditolak"
}
```

**Logic:**
- ✅ Jika metode Saldo: refund saldo + log refund
- ✅ Update order status ke "Ditolak"
- ✅ Jika hutang pending: tidak ada perubahan hutang

#### `/api/topup-saldo` - Admin Top-up Saldo
**Purpose:** Admin menambah saldo siswa/guru
```
POST /api/topup-saldo
Body: {
  userType: "siswa" | "guru",
  userId: nis | nip,
  amount: 100000,
  metode: "Transfer" | "Cash"
}

Response: {
  success: true,
  newSaldo: 250000,
  message: "Saldo berhasil ditambah..."
}
```

**Logic:**
- ✅ Update saldo user
- ✅ Log transaksi dengan tipe "Top-up"

#### `/api/payment-hutang` - Pembayaran Hutang
**Purpose:** Admin atau user bayar hutang (dari saldo)
```
POST /api/payment-hutang
Body: {
  userType: "siswa" | "guru",
  userId: nis | nip,
  amount: 50000,
  paymentMethod: "Admin" | "Saldo"
}

Response: {
  success: true,
  newHutang: 100000,
  newSaldo: 200000,
  message: "Hutang berkurang..."
}
```

**Logic:**
- ✅ Validasi nominal tidak melebihi hutang
- ✅ Jika Saldo: cek saldo user cukup
- ✅ Kurangi total_hutang
- ✅ Jika via Saldo: kurangi saldo juga
- ✅ Log transaksi

---

### 2. **Halaman User (Siswa & Guru)**

#### Halaman **Beli Produk** - Self-Service Order
- **File:** `src/app/(siswa)/beli-produk/page.jsx` & `src/app/guru/beli-produk/page.jsx`
- ✅ Tampilkan daftar produk dengan stok
- ✅ Keranjang belanja (add/remove/update qty)
- ✅ Pilih metode pembayaran (Saldo/Hutang)
- ✅ Submit order → API → pending konfirmasi admin
- ✅ Riwayat transaksi (kombinasi order + transaksi kasir)
- ✅ Jika Saldo: saldo berkurang langsung
- ✅ Pesan notifikasi success/error

#### Halaman **Saldo Saya** - Balance Management
- **File:** `src/app/(siswa)/saldo/page.jsx` & `src/app/guru/saldo/page.jsx`
- ✅ Tampilkan saldo saat ini
- ✅ Tampilkan total hutang (jika ada)
- ✅ **BARU:** Form pembayaran hutang dengan saldo
  - Input nominal pembayaran
  - Validasi saldo cukup
  - Tombol "Bayar Sekarang"
  - Notifikasi success/error
- ✅ Riwayat saldo dengan detail:
  - Tanggal & waktu
  - Nominal (+ untuk masuk, - untuk keluar)
  - Tipe transaksi (Top-up, Pembelian, Refund, Pembayaran Hutang)
  - Keterangan/deskripsi

#### Halaman **Hutang Saya** - Debt Management
- **File:** `src/app/(siswa)/hutang-saya/page.jsx` & `src/app/guru/hutang-saya/page.jsx`
- ✅ Tampilkan total hutang
- ✅ Riwayat hutang (transaksi + order pending)
- ✅ Status order untuk setiap hutang:
  - Menunggu → order pending konfirmasi
  - Dikonfirmasi → hutang confirmed
  - Ditolak → hutang ditolak

---

### 3. **Halaman Admin**

#### **Kasir POS** - Transaksi Langsung
- **File:** `src/app/(admin)/kasir/page.jsx`
- ✅ Daftar produk dengan stok
- ✅ Pilih customer (siswa/guru)
- ✅ Keranjang belanja
- ✅ Pilih metode pembayaran (Tunai/QRIS/Hutang)
- ✅ Submit → langsung create transaksi (tidak perlu konfirmasi)
- ✅ Update stok produk langsung
- ✅ Update hutang jika pembayaran Hutang

#### **Order Siswa** - Order Management
- **File:** `src/app/(admin)/order-siswa/page.jsx`
- ✅ Daftar order siswa (pending/dikonfirmasi/ditolak)
- ✅ Statistic cards (Total, Menunggu, Dikonfirmasi, Ditolak)
- ✅ Pilih order → lihat detail & items
- ✅ Tombol **Konfirmasi:**
  - Jika Saldo: log transaksi saldo
  - Jika Hutang: tambah total_hutang + log transaksi
  - Update stok produk
- ✅ Tombol **Tolak:**
  - Jika Saldo: refund saldo + log refund
  - Jika Hutang pending: cukup ubah status

#### **Order Guru** - Order Management
- **File:** `src/app/(admin)/order-guru/page.jsx`
- ✅ Sama dengan Order Siswa tapi untuk guru
- ✅ Terkoneksi dengan tabel `order_guru` & `detail_order_guru`

#### **Top-up Saldo** - Admin Balance Management
- **File:** `src/app/(admin)/topup-saldo/page.jsx`
- ✅ Pilih user type (siswa/guru)
- ✅ Search & select user dari dropdown
- ✅ Input nominal top-up
- ✅ Pilih metode (Tunai/Transfer/dll)
- ✅ Submit → update saldo + log transaksi
- ✅ Notifikasi success

#### **Buku Hutang** - Hutang Management
- **File:** `src/app/(admin)/hutang/page.jsx`
- ✅ Daftar siswa/guru yang punya hutang
- ✅ Search by nama/NIS/NIP
- ✅ Pilih entry → modal input pembayaran
- ✅ Input metode pembayaran & nominal
- ✅ Submit → create transaksi pembayaran
- ✅ Update total_hutang user

---

## 📊 Database Schema (Sesuai rancangan)

### Tabel Utama
```
siswa:
  - nis (PK)
  - nama_siswa, kelas
  - saldo, total_hutang

guru:
  - nip (PK)
  - nama_guru, bidang_studi
  - saldo, total_hutang

order_siswa:
  - id (PK)
  - nis_siswa (FK)
  - total_harga
  - metode_pembayaran (Saldo/Hutang)
  - status_order (Menunggu/Dikonfirmasi/Ditolak)
  - status_pembayaran (Lunas/Belum Lunas)
  - created_at

detail_order_siswa:
  - order_id (FK)
  - produk_id (FK)
  - jumlah, harga_satuan

topup_saldo:
  - nis_siswa (FK)
  - jumlah, metode
  - tipe (Top-up/Order_Saldo/Refund/Hutang_Payment)
  - keterangan
  - created_at

topup_saldo_guru:
  - nip_guru (FK)
  - jumlah, metode
  - tipe, keterangan
  - created_at
```

---

## 🔄 Flow Transaksi Lengkap

### Flow 1: **Kasir - Tunai/QRIS**
```
1. Admin pilih produk → keranjang
2. Pilih customer & metode Tunai/QRIS
3. Submit → create transaksi directly
4. Update stok produk
5. Transaksi = "Lunas" immediately
6. Riwayat muncul di customer
```

### Flow 2: **Kasir - Hutang**
```
1. Admin pilih produk → keranjang
2. Pilih customer & metode Hutang
3. Submit → create transaksi
4. Update stok produk
5. Update total_hutang customer
6. Transaksi = "Belum Lunas"
7. Riwayat muncul di hutang page customer
```

### Flow 3: **Self-Service - Saldo**
```
1. Customer order produk dengan metode Saldo
2. System cek saldo cukup
3. CREATE ORDER (status=Menunggu)
4. Saldo berkurang LANGSUNG
5. Log saldo transaksi: "Order_Saldo" (pending)
6. Riwayat muncul di saldo page

7. ADMIN KONFIRMASI ORDER:
   - Update order status → Dikonfirmasi
   - Update stok produk
   - Log saldo transaksi: confirmed
   
   ATAU ADMIN REJECT ORDER:
   - Update order status → Ditolak
   - REFUND SALDO KEMBALI
   - Log saldo transaksi: "Refund"
```

### Flow 4: **Self-Service - Hutang**
```
1. Customer order produk dengan metode Hutang
2. CREATE ORDER (status=Menunggu)
3. Hutang BELUM bertambah (pending)
4. Riwayat muncul di hutang page dengan status Menunggu

5. ADMIN KONFIRMASI ORDER:
   - Update stok produk
   - TAMBAH total_hutang customer
   - Update order status → Dikonfirmasi
   - Log transaksi hutang
   
   ATAU ADMIN REJECT ORDER:
   - Update order status → Ditolak
   - Hutang tetap 0 (tidak ada perubahan)
```

### Flow 5: **Top-up Saldo (Admin)**
```
1. Admin pilih user (siswa/guru)
2. Input nominal & metode
3. Submit → /api/topup-saldo
4. Saldo bertambah
5. Log transaksi: tipe="Top-up"
6. Riwayat muncul di saldo page user
```

### Flow 6: **Pembayaran Hutang - Admin**
```
1. Admin buka Buku Hutang
2. Pilih user dengan hutang
3. Input nominal pembayaran & metode
4. Submit → create transaksi
5. total_hutang berkurang
6. Riwayat muncul di hutang page user
```

### Flow 7: **Pembayaran Hutang - Self-Service (Saldo)**
```
1. Customer buka halaman Saldo Saya
2. Lihat total hutang (jika ada)
3. Form "Bayar Hutang Dengan Saldo":
   - Input nominal pembayaran
   - System cek saldo cukup
   - Cek nominal ≤ total_hutang
4. Submit → /api/payment-hutang
5. Saldo berkurang + total_hutang berkurang
6. Log saldo transaksi: tipe="Hutang_Payment"
7. Riwayat muncul di kedua page (saldo & hutang)
```

---

## 📝 Riwayat Transaksi

### Tipe Riwayat Saldo (topup_saldo & topup_saldo_guru)
```
tipe:
- "Top-up"         → Admin tambah saldo
- "Order_Saldo"    → Pembelian dengan saldo (deduction)
- "Refund"         → Order ditolak, saldo dikembalikan
- "Hutang_Payment" → Pembayaran hutang dari saldo

Format Riwayat:
- Saldo Masuk: "Top-up", "Refund", "Hutang_Payment"
- Saldo Keluar: "Order_Saldo"
```

### Tipe Riwayat Transaksi (transaksi)
```
metode_pembayaran:
- "Tunai"      → Pembayaran tunai (kasir)
- "QRIS"       → Pembayaran QRIS (kasir)
- "Hutang"     → Transaksi hutang (kasir)
- "Pelunasan"  → Pembayaran hutang (admin)

status_pembayaran:
- "Lunas"      → Sudah bayar
- "Belum Lunas" → Belum bayar (hutang)
```

---

## 🎯 Key Features

### ✅ Implemented
- [x] API routes untuk semua operasi penting
- [x] Order creation & approval flow
- [x] Saldo management (topup, deduction, refund)
- [x] Hutang tracking & payment
- [x] Detailed transaction history
- [x] Admin control untuk approve/reject
- [x] User self-service payment
- [x] Transaction logging

### 📌 Notes
- Semua API routes sudah dibuat dan ready to use
- Halaman existing sudah ter-update dengan fitur pembayaran hutang
- Konsistensi antara siswa & guru terjaga
- Transaction history comprehensive dengan deskripsi yang jelas

---

## 🚀 Testing Checklist

- [ ] Kasir: Create transaksi dengan Tunai/QRIS/Hutang
- [ ] Order Siswa: Create order Saldo → Admin confirm → verify saldo berkurang 2x
- [ ] Order Siswa: Create order Hutang → Admin confirm → verify hutang bertambah
- [ ] Order Siswa: Create order Saldo → Admin reject → verify saldo di-refund
- [ ] Saldo: Top-up → verify saldo bertambah & log muncul
- [ ] Saldo: Bayar hutang dengan saldo → verify keduanya berkurang & log muncul
- [ ] Hutang: Admin bayarkan hutang → verify hutang berkurang
- [ ] Riwayat: Verify semua transaksi tercatat dengan tipe yang benar
- [ ] Order Guru: Test flow yang sama untuk guru

---

## 📞 Support
Jika ada pertanyaan atau bug, silakan tanyakan!
