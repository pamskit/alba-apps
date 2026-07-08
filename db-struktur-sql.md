

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

-- 7B. MEMBUAT TABEL ORDER GURU
CREATE TABLE order_guru (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nip_guru INT REFERENCES guru(nip) ON DELETE SET NULL,
    total_harga INT NOT NULL CHECK (total_harga >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Saldo', 'Hutang')),
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
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TRUNCATE SEMUA DATA DAN INSERT DUMMY DATA
-- Hati-hati: pastikan ini dijalankan di environment development atau test.

TRUNCATE detail_order_guru, detail_order_siswa, detail_transaksi, transaksi, order_guru, order_siswa, topup_saldo_guru, topup_saldo, produk, guru, siswa RESTART IDENTITY CASCADE;

INSERT INTO siswa (nis, nama_siswa, kelas, password, total_hutang, saldo) VALUES
(1000, 'Yudha', '10A', 'password123', 10000, 20000),
(1001, 'Andi Santoso', '10A', 'password123', 15000, 25000),
(1002, 'Budi Pratama', '10A', 'password123', 0, 40000),
(1003, 'Citra Maharani', '10B', 'password123', 20000, 12000),
(1004, 'Dewi Anggraini', '10B', 'password123', 5000, 5000),
(1005, 'Eka Saputra', '11A', 'password123', 0, 65000),
(1006, 'Fajar Nugroho', '11A', 'password123', 10000, 8000),
(1007, 'Gita Lestari', '11B', 'password123', 0, 30000),
(1008, 'Hardi Wijaya', '11B', 'password123', 25000, 10000),
(1009, 'Indah Permatasari', '12A', 'password123', 0, 45000),
(1010, 'Joko Susilo', '12A', 'password123', 15000, 15000),
(1011, 'Kiki Ramadhani', '12B', 'password123', 0, 52000),
(1012, 'Lina Putri', '12B', 'password123', 5000, 20000),
(1013, 'Mawar Septiani', '10C', 'password123', 0, 38000),
(1014, 'Nanda Hidayat', '10C', 'password123', 12000, 27000),
(1015, 'Oki Utama', '11C', 'password123', 0, 31000),
(1016, 'Putri Ramadani', '11C', 'password123', 8000, 22000),
(1017, 'Qori Aulia', '12C', 'password123', 0, 48000),
(1018, 'Rian Saputra', '12C', 'password123', 18000, 9000),
(1019, 'Sari Maharani', '10D', 'password123', 0, 35000),
(1020, 'Tono Wijaya', '10D', 'password123', 3000, 17000);

INSERT INTO guru (nip, nama_guru, bidang_studi, password, total_hutang, saldo) VALUES
(2001, 'Dr. Ahmad Suryanto', 'Matematika', 'guru123', 0, 50000),
(2002, 'Ibu Siti Nurhaliza', 'Bahasa Indonesia', 'guru123', 8000, 35000),
(2003, 'Pak Budi Kusuma', 'Fisika', 'guru123', 0, 42000),
(2004, 'Ibu Eka Wijaya', 'Kimia', 'guru123', 10000, 28000),
(2005, 'Pak Rendra Mustafa', 'Bahasa Inggris', 'guru123', 0, 55000),
(2006, 'Ibu Maya Puspita', 'Biologi', 'guru123', 5000, 32000),
(2007, 'Pak Hari Nugroho', 'Sejarah', 'guru123', 0, 38000),
(2008, 'Ibu Dewi Lestari', 'Ekonomi', 'guru123', 15000, 25000);

INSERT INTO produk (nama_produk, harga, stok) VALUES
('Roti Coklat', 5000, 30),
('Air Mineral 600ml', 3000, 50),
('Susu UHT', 7000, 25),
('Snack Kacang', 4500, 40),
('Buku Tulis', 8000, 20),
('Pulpen Hitam', 2500, 100),
('Pensil 2B', 2000, 120),
('Penghapus', 1500, 90),
('Penggaris 30cm', 4000, 60),
('Spidol Warna', 12000, 35),
('Tissue Kotak', 10000, 40),
('Roti Selai', 6000, 28),
('Permen Karet', 2000, 80),
('Minuman Soda', 8000, 20),
('Snack Bar', 6500, 45),
('Karton Makan', 5000, 50),
('Coklat Batang', 9500, 22),
('Keripik Kentang', 7000, 33),
('Es Krim Cup', 12000, 18),
('Sampul Buku', 1500, 110);

INSERT INTO transaksi (id, nis_siswa, total_bayar, metode_pembayaran, status_pembayaran, created_at) VALUES
('trx_1001', 1001, 15000, 'Tunai', 'Lunas', NOW() - INTERVAL '9 days'),
('trx_1002', 1002, 12000, 'QRIS', 'Lunas', NOW() - INTERVAL '8 days'),
('trx_1003', 1003, 5000, 'Pelunasan', 'Lunas', NOW() - INTERVAL '8 days'),
('trx_1004', 1004, 10000, 'Hutang', 'Belum Lunas', NOW() - INTERVAL '7 days'),
('trx_1005', 1005, 8000, 'Tunai', 'Lunas', NOW() - INTERVAL '7 days'),
('trx_1006', 1006, 6000, 'Pelunasan', 'Lunas', NOW() - INTERVAL '6 days'),
('trx_1007', 1007, 10000, 'Tunai', 'Lunas', NOW() - INTERVAL '6 days'),
('trx_1008', 1008, 20000, 'Hutang', 'Belum Lunas', NOW() - INTERVAL '5 days'),
('trx_1009', 1009, 13000, 'QRIS', 'Lunas', NOW() - INTERVAL '5 days'),
('trx_1010', 1010, 15000, 'Tunai', 'Lunas', NOW() - INTERVAL '4 days'),
('trx_1011', 1011, 9000, 'Pelunasan', 'Lunas', NOW() - INTERVAL '4 days'),
('trx_1012', 1012, 7000, 'Hutang', 'Belum Lunas', NOW() - INTERVAL '3 days'),
('trx_1013', 1013, 4000, 'Tunai', 'Lunas', NOW() - INTERVAL '3 days'),
('trx_1014', 1014, 16000, 'QRIS', 'Lunas', NOW() - INTERVAL '2 days'),
('trx_1015', 1015, 12000, 'Pelunasan', 'Lunas', NOW() - INTERVAL '2 days'),
('trx_1016', 1016, 11000, 'Tunai', 'Lunas', NOW() - INTERVAL '1 days'),
('trx_1017', 1017, 22000, 'Hutang', 'Belum Lunas', NOW() - INTERVAL '1 days'),
('trx_1018', 1018, 14000, 'QRIS', 'Lunas', NOW() - INTERVAL '12 hours'),
('trx_1019', 1019, 5000, 'Pelunasan', 'Lunas', NOW() - INTERVAL '6 hours'),
('trx_1020', 1020, 7500, 'Tunai', 'Lunas', NOW() - INTERVAL '2 hours');

INSERT INTO detail_transaksi (transaksi_id, produk_id, jumlah) VALUES
('trx_1001', 1, 2),
('trx_1002', 2, 3),
('trx_1003', 5, 1),
('trx_1004', 3, 2),
('trx_1005', 4, 2),
('trx_1006', 6, 2),
('trx_1007', 7, 3),
('trx_1008', 8, 4),
('trx_1009', 9, 2),
('trx_1010', 10, 1),
('trx_1011', 11, 2),
('trx_1012', 12, 3),
('trx_1013', 13, 2),
('trx_1014', 14, 2),
('trx_1015', 15, 1),
('trx_1016', 16, 2),
('trx_1017', 17, 2),
('trx_1018', 18, 1),
('trx_1019', 19, 3),
('trx_1020', 20, 2);

INSERT INTO topup_saldo (nis_siswa, jumlah, metode, keterangan, created_at) VALUES
(1001, 20000, 'Tunai', 'Top-up awal saldo', NOW() - INTERVAL '10 days'),
(1002, 15000, 'Transfer', 'Top-up kantin', NOW() - INTERVAL '9 days'),
(1003, 10000, 'Tunai', 'Top-up untuk belanja', NOW() - INTERVAL '8 days'),
(1004, 7000, 'Tunai', 'Top-up tambahan', NOW() - INTERVAL '7 days'),
(1005, 30000, 'Transfer', 'Saldo untuk kebutuhan', NOW() - INTERVAL '7 days'),
(1006, 12000, 'Tunai', 'Top-up rutin', NOW() - INTERVAL '6 days'),
(1007, 20000, 'Transfer', 'Saldo awal', NOW() - INTERVAL '6 days'),
(1008, 10000, 'Tunai', 'Top-up siswa', NOW() - INTERVAL '5 days'),
(1009, 22000, 'Transfer', 'Top-up koperasi', NOW() - INTERVAL '5 days'),
(1010, 18000, 'Tunai', 'Top-up harian', NOW() - INTERVAL '4 days'),
(1011, 25000, 'Transfer', 'Saldo cadangan', NOW() - INTERVAL '4 days'),
(1012, 9000, 'Tunai', 'Top-up tambahan', NOW() - INTERVAL '3 days'),
(1013, 17000, 'Transfer', 'Top-up buku', NOW() - INTERVAL '3 days'),
(1014, 14000, 'Tunai', 'Top-up persiapan', NOW() - INTERVAL '2 days'),
(1015, 22000, 'Transfer', 'Top-up makan', NOW() - INTERVAL '2 days'),
(1016, 12000, 'Tunai', 'Top-up ekstra', NOW() - INTERVAL '1 days'),
(1017, 26000, 'Transfer', 'Top-up awal minggu', NOW() - INTERVAL '1 days'),
(1018, 9000, 'Tunai', 'Top-up jaga-jaga', NOW() - INTERVAL '12 hours'),
(1019, 8000, 'Transfer', 'Top-up ringan', NOW() - INTERVAL '6 hours'),
(1020, 7000, 'Tunai', 'Top-up sore', NOW() - INTERVAL '2 hours');

INSERT INTO order_siswa (id, nis_siswa, total_harga, metode_pembayaran, status_order, status_pembayaran, keterangan, created_at) VALUES
('order_1001', 1001, 18000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order snack dan minuman', NOW() - INTERVAL '9 days'),
('order_1002', 1002, 22000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order buku tulis dan pulpen', NOW() - INTERVAL '8 days'),
('order_1003', 1003, 10000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order susu dan penghapus', NOW() - INTERVAL '8 days'),
('order_1004', 1004, 16000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order makanan ringan', NOW() - INTERVAL '7 days'),
('order_1005', 1005, 24000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order minuman dan roti', NOW() - INTERVAL '7 days'),
('order_1006', 1006, 14000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order alat tulis', NOW() - INTERVAL '6 days'),
('order_1007', 1007, 18000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order snack dan spidol', NOW() - INTERVAL '6 days'),
('order_1008', 1008, 21000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order minuman soda', NOW() - INTERVAL '5 days'),
('order_1009', 1009, 13000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order tissue dan pensil', NOW() - INTERVAL '5 days'),
('order_1010', 1010, 15000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order roti dan coklat', NOW() - INTERVAL '4 days'),
('order_1011', 1011, 23000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order buku dan minuman', NOW() - INTERVAL '4 days'),
('order_1012', 1012, 12000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order perlengkapan tulis', NOW() - INTERVAL '3 days'),
('order_1013', 1013, 9000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order permennya', NOW() - INTERVAL '3 days'),
('order_1014', 1014, 17000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order snack', NOW() - INTERVAL '2 days'),
('order_1015', 1015, 21000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order es krim dan minuman', NOW() - INTERVAL '2 days'),
('order_1016', 1016, 11000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order buku dan penggaris', NOW() - INTERVAL '1 days'),
('order_1017', 1017, 25000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order bahan snack', NOW() - INTERVAL '1 days'),
('order_1018', 1018, 14000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order roti lapis', NOW() - INTERVAL '12 hours'),
('order_1019', 1019, 8000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order tissue dan permen', NOW() - INTERVAL '6 hours'),
('order_1020', 1020, 10000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order ula', NOW() - INTERVAL '2 hours');

INSERT INTO detail_order_siswa (order_id, produk_id, jumlah, harga_satuan) VALUES
('order_1001', 1, 2, 5000),
('order_1001', 2, 2, 3000),
('order_1002', 5, 1, 8000),
('order_1002', 6, 2, 2500),
('order_1003', 3, 1, 7000),
('order_1003', 8, 1, 4000),
('order_1004', 4, 2, 4500),
('order_1004', 9, 2, 4000),
('order_1005', 12, 2, 6000),
('order_1005', 14, 1, 8000),
('order_1006', 5, 1, 8000),
('order_1006', 7, 2, 2000),
('order_1007', 10, 1, 12000),
('order_1007', 5, 1, 8000),
('order_1008', 14, 2, 8000),
('order_1008', 1, 1, 5000),
('order_1009', 11, 1, 10000),
('order_1009', 7, 1, 2000),
('order_1010', 1, 1, 5000),
('order_1010', 17, 1, 9500),
('order_1011', 5, 1, 8000),
('order_1011', 11, 1, 10000),
('order_1012', 6, 2, 2500),
('order_1012', 9, 1, 4000),
('order_1013', 13, 2, 2000),
('order_1013', 19, 1, 1500),
('order_1014', 4, 2, 4500),
('order_1014', 8, 1, 4000),
('order_1015', 18, 1, 12000),
('order_1015', 2, 1, 3000),
('order_1016', 5, 1, 8000),
('order_1016', 9, 1, 4000),
('order_1017', 3, 1, 7000),
('order_1017', 10, 1, 12000),
('order_1018', 1, 1, 5000),
('order_1018', 12, 1, 10000),
('order_1019', 11, 1, 10000),
('order_1019', 13, 1, 2000),
('order_1020', 2, 2, 3000),
('order_1020', 20, 1, 1500);

INSERT INTO topup_saldo_guru (nip_guru, jumlah, metode, keterangan, created_at) VALUES
(2001, 30000, 'Transfer', 'Top-up saldo awal', NOW() - INTERVAL '10 days'),
(2002, 20000, 'Tunai', 'Top-up untuk kebutuhan', NOW() - INTERVAL '8 days'),
(2003, 25000, 'Transfer', 'Top-up saldo kantin', NOW() - INTERVAL '7 days'),
(2004, 15000, 'Tunai', 'Top-up tambahan', NOW() - INTERVAL '6 days'),
(2005, 35000, 'Transfer', 'Top-up awal minggu', NOW() - INTERVAL '5 days'),
(2006, 18000, 'Tunai', 'Top-up makan', NOW() - INTERVAL '4 days'),
(2007, 22000, 'Transfer', 'Top-up harian', NOW() - INTERVAL '3 days'),
(2008, 12000, 'Tunai', 'Top-up cadangan', NOW() - INTERVAL '2 days');

INSERT INTO order_guru (id, nip_guru, total_harga, metode_pembayaran, status_order, status_pembayaran, keterangan, created_at) VALUES
('order_guru_2001', 2001, 18000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order snack dan minuman', NOW() - INTERVAL '9 days'),
('order_guru_2002', 2002, 15000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order makanan ringan', NOW() - INTERVAL '8 days'),
('order_guru_2003', 2003, 20000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order buku dan alat tulis', NOW() - INTERVAL '7 days'),
('order_guru_2004', 2004, 12000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order perlengkapan', NOW() - INTERVAL '6 days'),
('order_guru_2005', 2005, 22000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order minuman dan roti', NOW() - INTERVAL '5 days'),
('order_guru_2006', 2006, 14000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order snack', NOW() - INTERVAL '4 days'),
('order_guru_2007', 2007, 16000, 'Hutang', 'Menunggu', 'Belum Lunas', 'Order makanan', NOW() - INTERVAL '3 days'),
('order_guru_2008', 2008, 11000, 'Saldo', 'Dikonfirmasi', 'Lunas', 'Order tissue dan permen', NOW() - INTERVAL '2 days');

INSERT INTO detail_order_guru (order_id, produk_id, jumlah, harga_satuan) VALUES
('order_guru_2001', 1, 2, 5000),
('order_guru_2001', 3, 1, 7000),
('order_guru_2001', 4, 1, 4500),
('order_guru_2002', 2, 5, 3000),
('order_guru_2002', 6, 1, 2500),
('order_guru_2003', 5, 2, 8000),
('order_guru_2003', 7, 1, 2000),
('order_guru_2003', 10, 1, 12000),
('order_guru_2004', 9, 2, 4000),
('order_guru_2004', 11, 1, 10000),
('order_guru_2005', 12, 2, 6000),
('order_guru_2005', 13, 1, 2000),
('order_guru_2005', 14, 1, 8000),
('order_guru_2006', 15, 1, 6500),
('order_guru_2006', 16, 1, 5000),
('order_guru_2006', 2, 1, 3000),
('order_guru_2007', 18, 1, 7000),
('order_guru_2007', 8, 1, 1500),
('order_guru_2007', 19, 1, 12000),
('order_guru_2008', 11, 1, 10000),
('order_guru_2008', 13, 1, 2000),
('order_guru_2008', 20, 2, 1500);

