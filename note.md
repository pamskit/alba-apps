Struktur database saat ini

-- 1. MEMBUAT TABEL SISWA
CREATE TABLE siswa (
    nis INT PRIMARY KEY,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    password TEXT NOT NULL,
    total_hutang INT DEFAULT 0 CHECK (total_hutang >= 0),
    saldo INT DEFAULT 0 CHECK (saldo >= 0)
);

-- 2. MEMBUAT TABEL PRODUK
CREATE TABLE produk (
    id SERIAL PRIMARY KEY,
    nama_produk TEXT NOT NULL,
    harga INT NOT NULL CHECK (harga >= 0),
    stok INT NOT NULL DEFAULT 0 CHECK (stok >= 0)
);

-- 3. MEMBUAT TABEL TRANSAKSI
CREATE TABLE transaksi (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nis_siswa INT REFERENCES siswa(nis) ON DELETE SET NULL,
    total_bayar INT NOT NULL CHECK (total_bayar >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Tunai', 'QRIS', 'Hutang', 'Pelunasan')),
    status_pembayaran TEXT NOT NULL CHECK (status_pembayaran IN ('Lunas', 'Belum Lunas'))
);

-- 4. MEMBUAT TABEL DETAIL TRANSAKSI
CREATE TABLE detail_transaksi (
    id SERIAL PRIMARY KEY,
    transaksi_id TEXT REFERENCES transaksi(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0)
);

-- 5. MEMBUAT TABEL TOPUP SALDO
CREATE TABLE topup_saldo (
    id SERIAL PRIMARY KEY,
    nis_siswa INT REFERENCES siswa(nis) ON DELETE CASCADE,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    metode TEXT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MEMBUAT TABEL ORDER SISWA
CREATE TABLE order_siswa (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nis_siswa INT REFERENCES siswa(nis) ON DELETE SET NULL,
    total_harga INT NOT NULL CHECK (total_harga >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Saldo', 'Hutang')),
    status_order TEXT NOT NULL CHECK (status_order IN ('Menunggu', 'Dikonfirmasi', 'Ditolak')),
    status_pembayaran TEXT NOT NULL CHECK (status_pembayaran IN ('Lunas', 'Belum Lunas')),
    keterangan TEXT
);

-- 7. MEMBUAT TABEL DETAIL ORDER SISWA
CREATE TABLE detail_order_siswa (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES order_siswa(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    harga_satuan INT NOT NULL CHECK (harga_satuan >= 0)
);

Fitur selanjutnya yang akan dibuat:
1. Siswa akan punya saldo. Contoh kasus: siswa dapat isi saldo dengan cara membayar ke admin atau kasir sehingga nanti admin akan menambahkan saldo siswa dan dapat digunakan untuk pembayaran di koperasi.
2. Siswa ada self service. Contoh kasusnya jika siswa ingin memesan suatu barang dari koperasi namun saat itu siswa sedang tidak di koperasi. jadi buatkan seperti online shop pada umumnya, ada keranjang terus dapat juga melakukan pembayaran. nanti dari admin tinggal di konfirmasi.