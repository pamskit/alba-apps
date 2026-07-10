

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
    harga_beli INT NOT NULL DEFAULT 0 CHECK (harga_beli >= 0),
    harga_jual INT NOT NULL DEFAULT 0 CHECK (harga_jual >= 0),
    stok INT NOT NULL DEFAULT 0 CHECK (stok >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
(10000, 'Fery Irwandi', '10A', 'siswa123', 0, 50000),
(10100, 'Ariel Putri', '10A', 'siswa123', 15000, 45000),
(10101, 'Bima Santoso', '11B', 'siswa123', 0, 68000),
(10102, 'Citra Dewi', '12C', 'siswa123', 5000, 12000),
(10103, 'Dedi Wirawan', '10B', 'siswa123', 30000, 25000),
(10104, 'Elena Rahma', '11A', 'siswa123', 0, 90000),
(10105, 'Farhan Pratama', '12A', 'siswa123', 10000, 32000),
(10106, 'Gita Sari', '10C', 'siswa123', 0, 56000),
(10107, 'Hendri Kurniawan', '11C', 'siswa123', 20000, 18000),
(10108, 'Indra Wijaya', '12B', 'siswa123', 0, 72000),
(10109, 'Jihan Amelia', '10A', 'siswa123', 5000, 24000),
(10110, 'Karina Putri', '11B', 'siswa123', 0, 83000),
(10111, 'Lukman Hakim', '12C', 'siswa123', 8000, 15000),
(10112, 'Maya Lestari', '10B', 'siswa123', 0, 91000),
(10113, 'Nadia Fitri', '11A', 'siswa123', 12000, 27000),
(10114, 'Oka Saputra', '12A', 'siswa123', 0, 62000),
(10115, 'Pratiwi Sari', '10C', 'siswa123', 7000, 38000),
(10116, 'Qori Nur', '11C', 'siswa123', 0, 54000),
(10117, 'Rian Purnama', '12B', 'siswa123', 25000, 21000),
(10118, 'Santi Dewi', '10A', 'siswa123', 0, 66000),
(10119, 'Tito Ramadhan', '11B', 'siswa123', 15000, 29000),
(10120, 'Umi Yuliana', '12C', 'siswa123', 0, 73000),
(10121, 'Vina Salsabila', '10B', 'siswa123', 10000, 31000),
(10122, 'Wahyu Hidayat', '11A', 'siswa123', 5000, 27000),
(10123, 'Xavier Nugroho', '12A', 'siswa123', 0, 82000),
(10124, 'Yuni Amelia', '10C', 'siswa123', 0, 56000),
(10125, 'Zaki Ahmad', '11C', 'siswa123', 18000, 19000),
(10126, 'Ayu Karina', '12B', 'siswa123', 0, 70000),
(10127, 'Bayu Prasetyo', '10A', 'siswa123', 22000, 21000),
(10128, 'Cindy Anggraeni', '11B', 'siswa123', 0, 66000),
(10129, 'Dimas Kurnia', '12C', 'siswa123', 30000, 14000),
(10130, 'Eka Putra', '10B', 'siswa123', 0, 59000),
(10131, 'Fanny Nur', '11A', 'siswa123', 10000, 32000),
(10132, 'Galih Pratama', '12A', 'siswa123', 0, 76000),
(10133, 'Hani Fatima', '10C', 'siswa123', 5000, 26000),
(10134, 'Ikram Hadi', '11C', 'siswa123', 0, 64000),
(10135, 'Joko Susilo', '12B', 'siswa123', 12000, 28000),
(10136, 'Kiki Marlina', '10A', 'siswa123', 0, 71000),
(10137, 'Lia Novita', '11B', 'siswa123', 9000, 35000),
(10138, 'Miftahul Huda', '12C', 'siswa123', 0, 86000),
(10139, 'Nina Kurnia', '10B', 'siswa123', 15000, 23000),
(10140, 'Owen Ricardo', '11A', 'siswa123', 0, 77000),
(10141, 'Putri Melati', '12A', 'siswa123', 8000, 34000),
(10142, 'Qiana Safitri', '10C', 'siswa123', 0, 69000),
(10143, 'Rizki Maulana', '11C', 'siswa123', 20000, 18000),
(10144, 'Salsa Ramadhani', '12B', 'siswa123', 0, 74000),
(10145, 'Tasya Adelia', '10A', 'siswa123', 13000, 25000),
(10146, 'Ujang Sigit', '11B', 'siswa123', 0, 61000),
(10147, 'Vania Putri', '12C', 'siswa123', 9000, 33000),
(10148, 'Wulan Nur', '10B', 'siswa123', 0, 68000),
(10149, 'Xena Prameswari', '11A', 'siswa123', 12000, 29000),
(10150, 'Yusuf Ramadhan', '12A', 'siswa123', 0, 80000);

INSERT INTO guru (nip, nama_guru, bidang_studi, password, total_hutang, saldo) VALUES
(30100, 'Rina Marlina', 'Bahasa Indonesia', 'guru123', 0, 120000),
(30101, 'Dedi Nurhadi', 'Fisika', 'guru123', 15000, 50000),
(30102, 'Fitri Anggraini', 'Biologi', 'guru123', 0, 85000),
(30103, 'Agus Santoso', 'Sejarah', 'guru123', 10000, 65000),
(30104, 'Maya Puspita', 'Ekonomi', 'guru123', 5000, 78000),
(30105, 'Budi Hartono', 'Matematika', 'guru123', 0, 94000),
(30106, 'Clara Dewi', 'Kimia', 'guru123', 12000, 56000),
(30107, 'Dewi Mahendra', 'TIK', 'guru123', 0, 88000),
(30108, 'Eko Susanto', 'Olahraga', 'guru123', 0, 53000),
(30109, 'Farah Lestari', 'Seni Budaya', 'guru123', 5000, 60000),
(30110, 'Gilang Prasetya', 'Geografi', 'guru123', 0, 72000),
(30111, 'Hendra Wijaya', 'Bahasa Inggris', 'guru123', 0, 81000),
(30112, 'Indah Pertiwi', 'Prakarya', 'guru123', 4000, 47000),
(30113, 'Joko Pranata', 'Agama', 'guru123', 0, 69000),
(30114, 'Kartini Wulandari', 'PKn', 'guru123', 0, 76000),
(30115, 'Lina Sari', 'Musik', 'guru123', 3000, 52000),
(30116, 'Manda Fitria', 'Kewirausahaan', 'guru123', 0, 83000),
(30117, 'Niko Arian', 'Bahasa Jawa', 'guru123', 0, 58000),
(30118, 'Oni Oktavia', 'IPS', 'guru123', 7000, 42000),
(30119, 'Putu Adi', 'Tata Busana', 'guru123', 0, 66000);
INSERT INTO produk (nama_produk, harga_beli, harga_jual, stok) VALUES
('Roti Coklat', 4000, 5000, 30),
('Air Mineral 600ml', 2000, 3000, 50),
('Buku Tulis 50L', 7000, 10000, 100),
('Pensil 2B', 1000, 2000, 150),
('Pulpen Gel', 1500, 3000, 80),
('Snack Kentang', 3000, 5000, 40),
('Susu UHT 200ml', 5000, 7000, 25),
('Topi Sekolah', 15000, 20000, 15);

INSERT INTO transaksi (id, nis_siswa, nip_guru, total_bayar, metode_pembayaran, status_pembayaran) VALUES
('trx_20260711_001', 10101, NULL, 12000, 'Tunai', 'Lunas'),
('trx_20260711_002', 10102, NULL, 5000, 'Saldo', 'Lunas'),
('trx_20260711_003', 10103, NULL, 30000, 'Hutang', 'Belum Lunas'),
('trx_20260711_004', NULL, 30101, 22000, 'QRIS', 'Lunas'),
('trx_20260711_005', 10100, NULL, 5000, 'Pelunasan', 'Lunas');

INSERT INTO detail_transaksi (transaksi_id, produk_id, jumlah) VALUES
('trx_20260711_001', 1, 2),
('trx_20260711_001', 2, 1),
('trx_20260711_002', 5, 1),
('trx_20260711_003', 6, 4),
('trx_20260711_004', 3, 2),
('trx_20260711_004', 4, 2),
('trx_20260711_005', 7, 1);

INSERT INTO topup_saldo (nis_siswa, jumlah, metode, tipe, keterangan) VALUES
(10100, 50000, 'Tunai', 'Top-up', 'Top-up saldo untuk persiapan pembelian snack dan ATK'),
(10102, 10000, 'QRIS', 'Top-up', 'Top-up saldo untuk pelunasan hutang');

INSERT INTO order_siswa (id, nis_siswa, total_harga, metode_pembayaran, status_order, status_pembayaran, keterangan) VALUES
('ord_siswa_001', 10104, 25000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order seragam ekstra kelas 11A'),
('ord_siswa_002', 10101, 15000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order paket snack untuk les pagi');

INSERT INTO detail_order_siswa (order_id, produk_id, jumlah, harga_satuan) VALUES
('ord_siswa_001', 1, 3, 5000),
('ord_siswa_001', 4, 5, 2000),
('ord_siswa_002', 2, 2, 3000),
('ord_siswa_002', 5, 3, 3000);

INSERT INTO order_guru (id, nip_guru, total_harga, metode_pembayaran, status_order, status_pembayaran, keterangan) VALUES
('ord_guru_001', 30104, 18000, 'Tunai', 'Dikonfirmasi', 'Lunas', 'Pembelian alat tulis untuk kelas ekonomi'),
('ord_guru_002', 30101, 22000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order bahan percobaan fisika');

INSERT INTO detail_order_guru (order_id, produk_id, jumlah, harga_satuan) VALUES
('ord_guru_001', 3, 1, 10000),
('ord_guru_001', 5, 2, 3000),
('ord_guru_002', 6, 3, 5000),
('ord_guru_002', 4, 4, 2000);

INSERT INTO topup_saldo_guru (nip_guru, jumlah, metode, tipe, keterangan) VALUES
(30102, 40000, 'Tunai', 'Top-up', 'Top-up saldo guru untuk kas uang kelas'),
(30103, 15000, 'QRIS', 'Order_Saldo', 'Top-up untuk pesanan ATK tambahan');
