# 🚀 QUICK START - Alba Apps Implementation

## 📦 Files Baru (API Routes)

```
/src/app/api/
├── orders/
│   ├── create/route.js      ← Create self-service order
│   ├── confirm/route.js     ← Admin approve order
│   └── reject/route.js      ← Admin reject order
├── topup-saldo/route.js     ← Admin top-up saldo
└── payment-hutang/route.js  ← Payment hutang (admin/self-service)
```

## 📝 Files Diupdate

```
/src/app/
├── (siswa)/
│   └── saldo/
│       └── page.jsx         ← Added: handlePaymentHutang()
├── guru/
│   └── saldo/
│       └── page.jsx         ← Added: handlePaymentHutang()
└── (admin)/
    ├── kasir/page.jsx       ← Already working ✅
    ├── order-siswa/page.jsx ← Already working ✅
    ├── order-guru/page.jsx  ← Already working ✅
    ├── topup-saldo/page.jsx ← Already working ✅
    └── hutang/page.jsx      ← Already working ✅
```

## 🔧 API Usage Examples

### Create Order
```javascript
const response = await fetch("/api/orders/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userType: "siswa",
    userId: 10000,
    items: [
      { produk_id: 1, jumlah: 2 },
      { produk_id: 2, jumlah: 1 }
    ],
    metode_pembayaran: "Saldo"
  })
});
const { orderId, totalHarga } = await response.json();
```

### Confirm Order
```javascript
const response = await fetch("/api/orders/confirm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId: "order_siswa_1234567890",
    userType: "siswa"
  })
});
```

### Reject Order
```javascript
const response = await fetch("/api/orders/reject", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId: "order_siswa_1234567890",
    userType: "siswa"
  })
});
```

### Top-up Saldo
```javascript
const response = await fetch("/api/topup-saldo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userType: "siswa",
    userId: 10000,
    amount: 100000,
    metode: "Transfer"
  })
});
const { newSaldo } = await response.json();
```

### Payment Hutang
```javascript
const response = await fetch("/api/payment-hutang", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userType: "siswa",
    userId: 10000,
    amount: 50000,
    paymentMethod: "Saldo"
  })
});
const { newHutang, newSaldo } = await response.json();
```

## 📊 Database Tables Affected

```
siswa / guru:
  - saldo              ← Updated by API
  - total_hutang       ← Updated by API

order_siswa / order_guru:
  - status_order       ← Menunggu → Dikonfirmasi/Ditolak
  - status_pembayaran  ← Lunas/Belum Lunas

detail_order_siswa / detail_order_guru:
  - Diisi saat order dibuat

topup_saldo / topup_saldo_guru:
  - Baru entry untuk setiap transaksi

transaksi:
  - Baru entry untuk pembayaran & transaksi kasir

produk:
  - stok               ← Updated saat order confirm/kasir
```

## ⚡ Environment Variables Needed

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx  # ← IMPORTANT for API routes!
```

## ✅ Testing Checklist

- [ ] Kasir: Submit transaksi Tunai → verify stok berkurang
- [ ] Kasir: Submit transaksi Hutang → verify total_hutang bertambah
- [ ] Order: Create order Saldo → verify saldo berkurang & order pending
- [ ] Order: Admin confirm Saldo → verify stok berkurang & log created
- [ ] Order: Admin confirm Hutang → verify total_hutang bertambah & log created
- [ ] Order: Admin reject Saldo → verify saldo di-refund
- [ ] Topup: Admin top-up → verify saldo bertambah & log created
- [ ] Payment: Customer bayar hutang → verify saldo & hutang berkurang
- [ ] Riwayat: Verify semua tipe transaksi ter-log dengan benar

## 🐛 Common Issues

**Issue:** API returns 400 "Data tidak lengkap"
- **Fix:** Pastikan semua required fields ada di request body

**Issue:** Service Key tidak ditemukan
- **Fix:** Pastikan `SUPABASE_SERVICE_KEY` ada di `.env.local`

**Issue:** Stok tidak berkurang
- **Fix:** Pastikan order di-confirm, bukan hanya di-create

**Issue:** Saldo tidak muncul di history
- **Fix:** Check `topup_saldo` table, pastikan tipe yang benar

## 📚 Documentation

- `IMPLEMENTATION_GUIDE.md` - Full implementation details
- `COMPLETION_SUMMARY.md` - Executive summary
- `db-struktur-sql.md` - Database schema

---

**Happy Testing! 🎉**
