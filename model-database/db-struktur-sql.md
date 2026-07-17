

-- 0. DROP SEMUA TABEL (urutan sesuai foreign key dependencies)
DROP TABLE IF EXISTS detail_order_siswa CASCADE;
DROP TABLE IF EXISTS detail_order_guru CASCADE;
DROP TABLE IF EXISTS saldo_log CASCADE;
DROP TABLE IF EXISTS detail_transaksi CASCADE;
DROP TABLE IF EXISTS order_siswa CASCADE;
DROP TABLE IF EXISTS order_guru CASCADE;
DROP TABLE IF EXISTS topup_saldo CASCADE;
DROP TABLE IF EXISTS topup_saldo_guru CASCADE;
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
    kode_produk TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    nama_produk TEXT NOT NULL,
    harga_beli INT NOT NULL DEFAULT 0 CHECK (harga_beli >= 0),
    harga_jual INT NOT NULL DEFAULT 0 CHECK (harga_jual >= 0),
    stok INT NOT NULL DEFAULT 0 CHECK (stok >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEMBUAT TABEL TRANSAKSI TERPADU
CREATE TABLE transaksi (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    customer_type TEXT NOT NULL CHECK (customer_type IN ('siswa', 'guru')),
    nis_siswa INT REFERENCES siswa(nis) ON DELETE SET NULL,
    nip_guru INT REFERENCES guru(nip) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'order', 'topup', 'hutang_payment', 'refund')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Tunai', 'QRIS', 'Saldo', 'Hutang', 'Transfer')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Lunas', 'Belum Lunas', 'Partial', 'Dibatalkan')),
    order_status TEXT CHECK (order_status IN ('Menunggu', 'Dikonfirmasi', 'Ditolak', 'Selesai', 'Dibatalkan')),
    amount_total INT NOT NULL CHECK (amount_total >= 0),
    amount_paid INT NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    amount_due INT NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
    note TEXT,
    metadata JSONB,
    CHECK (
        (customer_type = 'siswa' AND nis_siswa IS NOT NULL AND nip_guru IS NULL)
        OR (customer_type = 'guru' AND nip_guru IS NOT NULL AND nis_siswa IS NULL)
    ),
    CHECK (
        (transaction_type IN ('order') AND order_status IS NOT NULL)
        OR (transaction_type NOT IN ('order') AND order_status IS NULL)
    )
);

-- 4. MEMBUAT TABEL ORDER SISWA (LEGACY)
CREATE TABLE order_siswa (
    id TEXT PRIMARY KEY,
    nis_siswa INT NOT NULL REFERENCES siswa(nis) ON DELETE CASCADE,
    total_harga INT NOT NULL CHECK (total_harga >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Tunai', 'QRIS', 'Saldo', 'Hutang', 'Transfer')),
    status_order TEXT NOT NULL CHECK (status_order IN ('Menunggu', 'Dikonfirmasi', 'Ditolak', 'Selesai', 'Dibatalkan')),
    status_pembayaran TEXT NOT NULL CHECK (status_pembayaran IN ('Lunas', 'Belum Lunas', 'Partial', 'Dibatalkan')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4B. MEMBUAT TABEL ORDER GURU (LEGACY)
CREATE TABLE order_guru (
    id TEXT PRIMARY KEY,
    nip_guru INT NOT NULL REFERENCES guru(nip) ON DELETE CASCADE,
    total_harga INT NOT NULL CHECK (total_harga >= 0),
    metode_pembayaran TEXT NOT NULL CHECK (metode_pembayaran IN ('Tunai', 'QRIS', 'Saldo', 'Hutang', 'Transfer')),
    status_order TEXT NOT NULL CHECK (status_order IN ('Menunggu', 'Dikonfirmasi', 'Ditolak', 'Selesai', 'Dibatalkan')),
    status_pembayaran TEXT NOT NULL CHECK (status_pembayaran IN ('Lunas', 'Belum Lunas', 'Partial', 'Dibatalkan')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MEMBUAT TABEL DETAIL ORDER SISWA (LEGACY)
CREATE TABLE detail_order_siswa (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES order_siswa(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    harga_satuan INT NOT NULL CHECK (harga_satuan >= 0)
);

-- 5B. MEMBUAT TABEL DETAIL ORDER GURU (LEGACY)
CREATE TABLE detail_order_guru (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES order_guru(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    harga_satuan INT NOT NULL CHECK (harga_satuan >= 0)
);

-- 6. MEMBUAT TABEL DETAIL TRANSAKSI
CREATE TABLE detail_transaksi (
    id SERIAL PRIMARY KEY,
    transaksi_id TEXT REFERENCES transaksi(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    harga_satuan INT NOT NULL CHECK (harga_satuan >= 0),
    sub_total INT NOT NULL CHECK (sub_total >= 0)
);

-- 7. MEMBUAT TABEL SALDO LOG
CREATE TABLE saldo_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    customer_type TEXT NOT NULL CHECK (customer_type IN ('siswa', 'guru')),
    nis_siswa INT REFERENCES siswa(nis) ON DELETE SET NULL,
    nip_guru INT REFERENCES guru(nip) ON DELETE SET NULL,
    transaksi_id TEXT REFERENCES transaksi(id) ON DELETE SET NULL,
    log_type TEXT NOT NULL CHECK (log_type IN ('Top-up', 'Order_Saldo', 'Hutang_Payment', 'Refund', 'Adjustment')),
    amount INT NOT NULL CHECK (amount <> 0),
    balance_before INT NOT NULL CHECK (balance_before >= 0),
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Tunai', 'QRIS', 'Saldo', 'Hutang', 'Transfer')),
    note TEXT,
    CHECK (
        (customer_type = 'siswa' AND nis_siswa IS NOT NULL AND nip_guru IS NULL)
        OR (customer_type = 'guru' AND nip_guru IS NOT NULL AND nis_siswa IS NULL)
    )
);

-- 8. MEMBUAT TABEL TOPUP SISWA (LEGACY)
CREATE TABLE topup_saldo (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nis_siswa INT NOT NULL REFERENCES siswa(nis) ON DELETE CASCADE,
    tipe TEXT NOT NULL DEFAULT 'Top-up',
    metode TEXT NOT NULL CHECK (metode IN ('Tunai', 'QRIS', 'Saldo', 'Hutang', 'Transfer')),
    jumlah INT NOT NULL CHECK (jumlah > 0),
    keterangan TEXT
);

-- 8B. MEMBUAT TABEL TOPUP GURU (LEGACY)
CREATE TABLE topup_saldo_guru (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nip_guru INT NOT NULL REFERENCES guru(nip) ON DELETE CASCADE,
    tipe TEXT NOT NULL DEFAULT 'Top-up',
    metode TEXT NOT NULL CHECK (metode IN ('Tunai', 'QRIS', 'Saldo', 'Hutang', 'Transfer')),
    jumlah INT NOT NULL CHECK (jumlah > 0),
    keterangan TEXT
);

-- 9. RESET DATABASE KE KEADAAN BERSIH (Minimal Setup)
-- ============================================================================
-- Truncate semua data untuk memulai dengan keadaan bersih.
-- Hati-hati: ini akan menghapus SEMUA data termasuk riwayat transaksi.

TRUNCATE TABLE detail_order_siswa CASCADE;
TRUNCATE TABLE detail_order_guru CASCADE;
TRUNCATE TABLE saldo_log CASCADE;
TRUNCATE TABLE detail_transaksi CASCADE;
TRUNCATE TABLE order_siswa CASCADE;
TRUNCATE TABLE order_guru CASCADE;
TRUNCATE TABLE topup_saldo CASCADE;
TRUNCATE TABLE topup_saldo_guru CASCADE;
TRUNCATE TABLE transaksi CASCADE;
TRUNCATE TABLE produk CASCADE;
TRUNCATE TABLE guru CASCADE;
TRUNCATE TABLE siswa CASCADE;

-- Reset IDENTITY untuk auto-increment fields ke 1 (jika menggunakan SERIAL)
ALTER SEQUENCE produk_id_seq RESTART WITH 1;
ALTER SEQUENCE detail_order_siswa_id_seq RESTART WITH 1;
ALTER SEQUENCE detail_order_guru_id_seq RESTART WITH 1;
ALTER SEQUENCE detail_transaksi_id_seq RESTART WITH 1;
ALTER SEQUENCE saldo_log_id_seq RESTART WITH 1;
ALTER SEQUENCE topup_saldo_id_seq RESTART WITH 1;
ALTER SEQUENCE topup_saldo_guru_id_seq RESTART WITH 1;

-- ============================================================================
-- 10. INSERT DATA MINIMAL (10 Produk, 1 Siswa, 1 Guru)
-- ============================================================================

-- 7A. INSERT 10 PRODUK RANDOM
INSERT INTO produk (kode_produk, barcode, nama_produk, harga_beli, harga_jual, stok) VALUES
('PRD-0001', '899100000001', 'Roti Coklat', 4000, 5500, 60),
('PRD-0002', '899100000002', 'Air Mineral 600ml', 2000, 3000, 120),
('PRD-0003', '899100000003', 'Buku Tulis 50L', 7000, 10000, 80),
('PRD-0004', '899100000004', 'Pensil 2B', 1000, 2000, 220),
('PRD-0005', '899100000005', 'Pulpen Gel', 1500, 3000, 140),
('PRD-0006', '899100000006', 'Susu UHT Coklat 200ml', 4500, 6500, 70),
('PRD-0007', '899100000007', 'Biskuit Coklat', 3500, 5000, 90),
('PRD-0008', '899100000008', 'Mie Instan Goreng', 2800, 4000, 110),
('PRD-0009', '899100000009', 'Penghapus Karet', 800, 1500, 180),
('PRD-0010', '899100000010', 'Penggaris 30cm', 1200, 2500, 95);

-- 7B. INSERT 1 SISWA (NIS 111111)
INSERT INTO siswa (nis, nama_siswa, kelas, password, total_hutang, saldo) VALUES
(111111, 'Andi Pratama', '10A', 'siswa123', 0, 0);

-- 7C. INSERT 1 GURU (NIP 222222)
INSERT INTO guru (nip, nama_guru, bidang_studi, password, total_hutang, saldo) VALUES
(222222, 'Siti Rahmawati', 'Bahasa Indonesia', 'guru123', 0, 0);

-- ============================================================================
-- 11. VERIFIKASI DATA SETELAH INSERT
-- ============================================================================
SELECT COUNT(*) AS total_siswa FROM siswa;
SELECT COUNT(*) AS total_guru FROM guru;
SELECT COUNT(*) AS total_produk FROM produk;
SELECT COUNT(*) AS total_order_siswa FROM order_siswa;
SELECT COUNT(*) AS total_detail_order_siswa FROM detail_order_siswa;
SELECT COUNT(*) AS total_order_guru FROM order_guru;
SELECT COUNT(*) AS total_detail_order_guru FROM detail_order_guru;
SELECT COUNT(*) AS total_topup_saldo FROM topup_saldo;
SELECT COUNT(*) AS total_topup_saldo_guru FROM topup_saldo_guru;
SELECT COUNT(*) AS total_transaksi FROM transaksi;
SELECT COUNT(*) AS total_detail_transaksi FROM detail_transaksi;
SELECT COUNT(*) AS total_saldo_log FROM saldo_log;

-- Hasil yang diharapkan:
-- total_siswa: 1
-- total_guru: 1
-- total_produk: 10
-- total_order_siswa: 0
-- total_detail_order_siswa: 0
-- total_order_guru: 0
-- total_detail_order_guru: 0
-- total_topup_saldo: 0
-- total_topup_saldo_guru: 0
-- total_transaksi: 0
-- total_detail_transaksi: 0
-- total_saldo_log: 0
