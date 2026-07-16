

-- 0. DROP SEMUA TABEL (urutan sesuai foreign key dependencies)
DROP TABLE IF EXISTS saldo_log CASCADE;
DROP TABLE IF EXISTS detail_transaksi CASCADE;
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

-- 4. MEMBUAT TABEL DETAIL TRANSAKSI
CREATE TABLE detail_transaksi (
    id SERIAL PRIMARY KEY,
    transaksi_id TEXT REFERENCES transaksi(id) ON DELETE CASCADE,
    produk_id INT REFERENCES produk(id) ON DELETE SET NULL,
    jumlah INT NOT NULL CHECK (jumlah > 0),
    harga_satuan INT NOT NULL CHECK (harga_satuan >= 0),
    sub_total INT NOT NULL CHECK (sub_total >= 0)
);

-- 5. MEMBUAT TABEL SALDO LOG
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

-- 6. RESET DATABASE KE KEADAAN BERSIH (Minimal Setup)
-- ============================================================================
-- Truncate semua data untuk memulai dengan keadaan bersih.
-- Hati-hati: ini akan menghapus SEMUA data termasuk riwayat transaksi.

TRUNCATE TABLE saldo_log CASCADE;
TRUNCATE TABLE detail_transaksi CASCADE;
TRUNCATE TABLE transaksi CASCADE;
TRUNCATE TABLE produk CASCADE;
TRUNCATE TABLE guru CASCADE;
TRUNCATE TABLE siswa CASCADE;

-- Reset IDENTITY untuk auto-increment fields ke 1 (jika menggunakan SERIAL)
ALTER SEQUENCE produk_id_seq RESTART WITH 1;
ALTER SEQUENCE detail_transaksi_id_seq RESTART WITH 1;
ALTER SEQUENCE saldo_log_id_seq RESTART WITH 1;

-- ============================================================================
-- 7. INSERT DATA MINIMAL (5 Produk, 1 Siswa, 1 Guru)
-- ============================================================================

-- 7A. INSERT 5 PRODUK
INSERT INTO produk (nama_produk, harga_beli, harga_jual, stok) VALUES
('Roti Coklat', 4000, 5000, 50),
('Air Mineral 600ml', 2000, 3000, 100),
('Buku Tulis 50L', 7000, 10000, 75),
('Pensil 2B', 1000, 2000, 200),
('Pulpen Gel', 1500, 3000, 120);

-- 7B. INSERT 1 SISWA (tanpa saldo, tanpa hutang)
INSERT INTO siswa (nis, nama_siswa, kelas, password, total_hutang, saldo) VALUES
(10000, 'Fery Irwandi', '10A', 'siswa123', 0, 0);

-- 7C. INSERT 1 GURU (tanpa saldo, tanpa hutang)
INSERT INTO guru (nip, nama_guru, bidang_studi, password, total_hutang, saldo) VALUES
(30100, 'Rina Marlina', 'Bahasa Indonesia', 'guru123', 0, 0);

-- ============================================================================
-- 8. VERIFIKASI DATA SETELAH INSERT
-- ============================================================================
SELECT COUNT(*) AS total_siswa FROM siswa;
SELECT COUNT(*) AS total_guru FROM guru;
SELECT COUNT(*) AS total_produk FROM produk;
SELECT COUNT(*) AS total_transaksi FROM transaksi;
SELECT COUNT(*) AS total_detail_transaksi FROM detail_transaksi;
SELECT COUNT(*) AS total_saldo_log FROM saldo_log;

-- Hasil yang diharapkan:
-- total_siswa: 1
-- total_guru: 1
-- total_produk: 5
-- total_transaksi: 0
-- total_detail_transaksi: 0
-- total_saldo_log: 0
