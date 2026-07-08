

-- 0. DROP SEMUA TABEL (urutan sesuai foreign key dependencies)
DROP TABLE IF EXISTS detail_order_guru CASCADE;
DROP TABLE IF EXISTS detail_order_siswa CASCADE;
DROP TABLE IF EXISTS detail_transaksi CASCADE;
DROP TABLE IF EXISTS topup_saldo_guru CASCADE;
DROP TABLE IF EXISTS topup_saldo CASCADE;
DROP TABLE IF EXISTS order_guru CASCADE;
DROP TABLE IF EXISTS order_siswa CASCADE;
DROP TABLE IF EXISTS transaksi CASCADE;
DROP TABLE IF EXISTS produk CASCADE;
DROP TABLE IF EXISTS guru CASCADE;
DROP TABLE IF EXISTS siswa CASCADE;

-- 1. MEMBUAT TABEL SISWA
CREATE TABLE siswa (
    nis INT PRIMARY KEY,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    password TEXT NOT NULL,
    total_hutang INT DEFAULT 0 CHECK (total_hutang >= 0),
    saldo INT DEFAULT 0 CHECK (saldo >= 0)
);

-- 1B. MEMBUAT TABEL GURU
CREATE TABLE guru (
    nip INT PRIMARY KEY,
    nama_guru TEXT NOT NULL,
    bidang_studi TEXT NOT NULL,
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
    nip_guru INT REFERENCES guru(nip) ON DELETE SET NULL,
    total_bayar INT NOT NULL CHECK (total_bayar >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Tunai', 'QRIS', 'Hutang', 'Pelunasan', 'Saldo')),
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
    tipe TEXT NOT NULL DEFAULT 'Top-up' CHECK (tipe IN ('Top-up', 'Order_Saldo', 'Hutang_Payment', 'Refund')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MEMBUAT TABEL ORDER SISWA
CREATE TABLE order_siswa (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nis_siswa INT REFERENCES siswa(nis) ON DELETE SET NULL,
    total_harga INT NOT NULL CHECK (total_harga >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Saldo', 'Hutang', 'Tunai')),
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

-- 7B. MEMBUAT TABEL ORDER GURU
CREATE TABLE order_guru (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nip_guru INT REFERENCES guru(nip) ON DELETE SET NULL,
    total_harga INT NOT NULL CHECK (total_harga >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Saldo', 'Hutang', 'Tunai')),
    status_order TEXT NOT NULL CHECK (status_order IN ('Menunggu', 'Dikonfirmasi', 'Ditolak')),
    status_pembayaran TEXT NOT NULL CHECK (status_pembayaran IN ('Lunas', 'Belum Lunas')),
    keterangan TEXT
);

-- 7C. MEMBUAT TABEL DETAIL ORDER GURU
CREATE TABLE detail_order_guru (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES order_guru(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    harga_satuan INT NOT NULL CHECK (harga_satuan >= 0)
);

-- 7D. MEMBUAT TABEL TOPUP SALDO GURU
CREATE TABLE topup_saldo_guru (
    id SERIAL PRIMARY KEY,
    nip_guru INT REFERENCES guru(nip) ON DELETE CASCADE,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    metode TEXT NOT NULL,
    tipe TEXT NOT NULL DEFAULT 'Top-up' CHECK (tipe IN ('Top-up', 'Order_Saldo', 'Hutang_Payment', 'Refund')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TRUNCATE SEMUA DATA DAN INSERT DUMMY DATA
-- Hati-hati: pastikan ini dijalankan di environment development atau test.

TRUNCATE detail_order_guru, detail_order_siswa, detail_transaksi, transaksi, order_guru, order_siswa, topup_saldo_guru, topup_saldo, produk, guru, siswa RESTART IDENTITY CASCADE;

INSERT INTO siswa (nis, nama_siswa, kelas, password, total_hutang, saldo) VALUES
(10000, 'Gaja Mada', '10A', 'siswa123', 0, 100000);

INSERT INTO guru (nip, nama_guru, bidang_studi, password, total_hutang, saldo) VALUES
(20000, 'Dr. Ahmad Suryanto', 'Matematika', 'guru123', 0, 200000);

INSERT INTO produk (nama_produk, harga, stok) VALUES
('Roti Coklat', 5000, 30);
