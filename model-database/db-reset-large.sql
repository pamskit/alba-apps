-- Reset + seed dummy skala besar untuk Alba Apps
-- Tujuan: testing laporan, tabel panjang, dan pagination
-- Referensi struktur: db-struktur-sql.md

BEGIN;

-- 1) Bersihkan data
TRUNCATE TABLE saldo_log, detail_transaksi, transaksi, produk, guru, siswa
RESTART IDENTITY CASCADE;

-- 2) Seed siswa (40 baris, nama realistis)
WITH siswa_seed(no, nama_siswa, kelas, total_hutang, saldo) AS (
  VALUES
    (1, 'Ahmad Fauzan', '10A', 0, 18000),
    (2, 'Nabila Putri', '10A', 0, 22000),
    (3, 'Raka Pratama', '10B', 12000, 15000),
    (4, 'Salsa Nadhira', '10B', 0, 27000),
    (5, 'Dimas Saputra', '10C', 0, 8000),
    (6, 'Aulia Rahmah', '10C', 9000, 12000),
    (7, 'Bagas Maulana', '11A', 0, 30000),
    (8, 'Nadya Alifah', '11A', 15000, 5000),
    (9, 'Rizky Ananda', '11B', 0, 24000),
    (10, 'Shafa Zahra', '11B', 0, 19000),
    (11, 'Ilham Ramadhan', '11C', 0, 26000),
    (12, 'Tiara Azzahra', '11C', 18000, 4000),
    (13, 'Fikri Hidayat', '12-IPA', 0, 21000),
    (14, 'Aisyah Humaira', '12-IPA', 0, 25000),
    (15, 'Gilang Permana', '12-IPS', 20000, 0),
    (16, 'Kayla Maharani', '12-IPS', 0, 17000),
    (17, 'Arif Setiawan', '10A', 0, 16000),
    (18, 'Syifa Nurhaliza', '10A', 0, 23000),
    (19, 'Fadhil Akbar', '10B', 10000, 9000),
    (20, 'Putri Amelia', '10B', 0, 28000),
    (21, 'Reza Kurniawan', '10C', 0, 13000),
    (22, 'Laila Salsabila', '10C', 0, 21000),
    (23, 'Yusuf Maulana', '11A', 14000, 7000),
    (24, 'Anindya Puspita', '11A', 0, 26000),
    (25, 'Farhan Alfiansyah', '11B', 0, 20000),
    (26, 'Naura Khairunnisa', '11B', 0, 24000),
    (27, 'Rafi Pradana', '11C', 11000, 8000),
    (28, 'Maya Oktaviani', '11C', 0, 25000),
    (29, 'Aditiya Nugraha', '12-IPA', 0, 22000),
    (30, 'Citra Lestari', '12-IPA', 0, 18000),
    (31, 'Hafiz Ramdani', '12-IPS', 17000, 3000),
    (32, 'Nisa Aulia', '12-IPS', 0, 21000),
    (33, 'Mochammad Iqbal', '10A', 0, 15000),
    (34, 'Salma Fitria', '10B', 0, 19000),
    (35, 'Rendi Prakoso', '11A', 13000, 6000),
    (36, 'Dewi Anggraini', '11B', 0, 27000),
    (37, 'Vino Ardian', '11C', 0, 16000),
    (38, 'Nazwa Aqila', '12-IPA', 0, 23000),
    (39, 'Aldi Firmansyah', '12-IPS', 19000, 2000),
    (40, 'Intan Permata', '12-IPS', 0, 22000)
)
INSERT INTO siswa (nis, nama_siswa, kelas, password, total_hutang, saldo)
SELECT 11000 + no, nama_siswa, kelas, 'siswa123', total_hutang, saldo
FROM siswa_seed;

-- 3) Seed guru (15 baris, nama realistis)
WITH guru_seed(no, nama_guru, bidang_studi, total_hutang, saldo) AS (
  VALUES
    (1, 'Rina Marlina', 'Bahasa Indonesia', 0, 52000),
    (2, 'Agus Setiawan', 'Matematika', 18000, 34000),
    (3, 'Dewi Kusumawati', 'Biologi', 0, 61000),
    (4, 'Hendra Gunawan', 'Fisika', 0, 47000),
    (5, 'Siti Komariah', 'Kimia', 22000, 26000),
    (6, 'Bambang Suryadi', 'Sejarah', 0, 55000),
    (7, 'Yuni Astuti', 'Informatika', 0, 69000),
    (8, 'Miftahul Jannah', 'Ekonomi', 15000, 32000),
    (9, 'Rudi Hartono', 'PPKn', 0, 50000),
    (10, 'Novi Andriani', 'Geografi', 0, 48000),
    (11, 'Andri Kurniawan', 'Seni Budaya', 27000, 21000),
    (12, 'Fitriani Rahma', 'Bahasa Inggris', 0, 62000),
    (13, 'Eko Prasetyo', 'Penjaskes', 0, 45000),
    (14, 'Lina Handayani', 'Sosiologi', 12000, 38000),
    (15, 'Wahyu Hidayat', 'Agama', 0, 53000)
)
INSERT INTO guru (nip, nama_guru, bidang_studi, password, total_hutang, saldo)
SELECT 31000 + no, nama_guru, bidang_studi, 'guru123', total_hutang, saldo
FROM guru_seed;

-- 4) Seed produk (25 baris, nama realistis)
-- Tambahkan kode_produk + barcode agar kompatibel dengan skema produksi
WITH produk_seed(no, nama_produk, harga_beli, harga_jual, stok) AS (
  VALUES
    (1, 'Roti Coklat', 4000, 5000, 60),
    (2, 'Air Mineral 600ml', 2000, 3000, 120),
    (3, 'Buku Tulis 50 Lembar', 7000, 10000, 75),
    (4, 'Pensil 2B', 1000, 2000, 180),
    (5, 'Pulpen Gel Hitam', 1800, 3000, 140),
    (6, 'Penghapus Putih', 800, 1500, 200),
    (7, 'Penggaris 30cm', 1500, 3000, 90),
    (8, 'Susu UHT Coklat', 4500, 6500, 55),
    (9, 'Mie Cup Kari Ayam', 3500, 5000, 70),
    (10, 'Keripik Singkong Balado', 3000, 4500, 65),
    (11, 'Wafer Coklat', 2500, 4000, 85),
    (12, 'Teh Kotak Melati', 3000, 4500, 95),
    (13, 'Jus Jeruk Kotak', 3500, 5000, 88),
    (14, 'Biskuit Sandwich', 4000, 5500, 60),
    (15, 'Sosis Bakar Instan', 5000, 7000, 45),
    (16, 'Kertas HVS A4 10 Lembar', 2500, 4000, 110),
    (17, 'Spidol Hitam', 3500, 5500, 70),
    (18, 'Map Plastik', 2000, 3500, 100),
    (19, 'Sticky Notes', 3000, 5000, 80),
    (20, 'Sabun Cuci Tangan Mini', 3500, 5500, 50),
    (21, 'Masker Medis 5pcs', 5000, 8000, 65),
    (22, 'Baterai AA 2pcs', 6000, 9000, 40),
    (23, 'Buku Gambar A4', 6000, 9000, 55),
    (24, 'Lem Kertas', 2500, 4000, 85),
    (25, 'Correction Tape', 4000, 6500, 60)
)
INSERT INTO produk (kode_produk, barcode, nama_produk, harga_beli, harga_jual, stok)
SELECT
  'PRD-DUMMY-' || LPAD(no::text, 4, '0') AS kode_produk,
  '8991000' || LPAD(no::text, 6, '0') AS barcode,
  nama_produk,
  harga_beli,
  harga_jual,
  stok
FROM produk_seed;

-- 5) Seed transaksi topup siswa (20 baris)
INSERT INTO transaksi (
  id, created_at, customer_type, nis_siswa, nip_guru, transaction_type,
  payment_method, payment_status, order_status,
  amount_total, amount_paid, amount_due, note, metadata
)
SELECT
  'trx_topup_siswa_' || nis::text AS id,
  NOW() - ((nis - 11000) || ' days')::interval AS created_at,
  'siswa' AS customer_type,
  nis AS nis_siswa,
  NULL AS nip_guru,
  'topup' AS transaction_type,
  CASE WHEN nis % 2 = 0 THEN 'Tunai' ELSE 'Transfer' END AS payment_method,
  'Lunas' AS payment_status,
  NULL AS order_status,
  15000 + ((nis - 11000) * 500) AS amount_total,
  15000 + ((nis - 11000) * 500) AS amount_paid,
  0 AS amount_due,
  'Top-up dummy siswa' AS note,
  '{"seed":"large","kind":"topup"}'::jsonb AS metadata
FROM siswa
WHERE nis <= 11020;

-- 6) Seed transaksi topup guru (10 baris)
INSERT INTO transaksi (
  id, created_at, customer_type, nis_siswa, nip_guru, transaction_type,
  payment_method, payment_status, order_status,
  amount_total, amount_paid, amount_due, note, metadata
)
SELECT
  'trx_topup_guru_' || nip::text AS id,
  NOW() - ((nip - 31000) || ' days')::interval AS created_at,
  'guru' AS customer_type,
  NULL AS nis_siswa,
  nip AS nip_guru,
  'topup' AS transaction_type,
  'Transfer' AS payment_method,
  'Lunas' AS payment_status,
  NULL AS order_status,
  40000 + ((nip - 31000) * 1000) AS amount_total,
  40000 + ((nip - 31000) * 1000) AS amount_paid,
  0 AS amount_due,
  'Top-up dummy guru' AS note,
  '{"seed":"large","kind":"topup"}'::jsonb AS metadata
FROM guru
WHERE nip <= 31010;

-- 7) Seed transaksi order siswa (24 baris)
INSERT INTO transaksi (
  id, created_at, customer_type, nis_siswa, nip_guru, transaction_type,
  payment_method, payment_status, order_status,
  amount_total, amount_paid, amount_due, note, metadata
)
SELECT
  'trx_order_siswa_' || nis::text AS id,
  NOW() - ((nis - 10980) || ' hours')::interval AS created_at,
  'siswa' AS customer_type,
  nis AS nis_siswa,
  NULL AS nip_guru,
  'order' AS transaction_type,
  CASE
    WHEN nis % 3 = 0 THEN 'Saldo'
    WHEN nis % 3 = 1 THEN 'Tunai'
    ELSE 'Hutang'
  END AS payment_method,
  CASE
    WHEN nis % 3 = 2 THEN 'Belum Lunas'
    ELSE 'Lunas'
  END AS payment_status,
  CASE
    WHEN nis % 5 = 0 THEN 'Menunggu'
    WHEN nis % 7 = 0 THEN 'Ditolak'
    ELSE 'Dikonfirmasi'
  END AS order_status,
  12000 + ((nis - 11000) * 900) AS amount_total,
  CASE
    WHEN nis % 3 = 2 THEN 0
    ELSE 12000 + ((nis - 11000) * 900)
  END AS amount_paid,
  CASE
    WHEN nis % 3 = 2 THEN 12000 + ((nis - 11000) * 900)
    ELSE 0
  END AS amount_due,
  'Order dummy siswa' AS note,
  '{"seed":"large","kind":"order"}'::jsonb AS metadata
FROM siswa
WHERE nis BETWEEN 11001 AND 11024;

-- 8) Seed transaksi order guru (10 baris)
INSERT INTO transaksi (
  id, created_at, customer_type, nis_siswa, nip_guru, transaction_type,
  payment_method, payment_status, order_status,
  amount_total, amount_paid, amount_due, note, metadata
)
SELECT
  'trx_order_guru_' || nip::text AS id,
  NOW() - ((nip - 30990) || ' hours')::interval AS created_at,
  'guru' AS customer_type,
  NULL AS nis_siswa,
  nip AS nip_guru,
  'order' AS transaction_type,
  CASE
    WHEN nip % 2 = 0 THEN 'Saldo'
    ELSE 'Hutang'
  END AS payment_method,
  CASE
    WHEN nip % 2 = 0 THEN 'Lunas'
    ELSE 'Belum Lunas'
  END AS payment_status,
  CASE
    WHEN nip % 3 = 0 THEN 'Menunggu'
    ELSE 'Dikonfirmasi'
  END AS order_status,
  18000 + ((nip - 31000) * 1300) AS amount_total,
  CASE
    WHEN nip % 2 = 0 THEN 18000 + ((nip - 31000) * 1300)
    ELSE 0
  END AS amount_paid,
  CASE
    WHEN nip % 2 = 0 THEN 0
    ELSE 18000 + ((nip - 31000) * 1300)
  END AS amount_due,
  'Order dummy guru' AS note,
  '{"seed":"large","kind":"order"}'::jsonb AS metadata
FROM guru
WHERE nip BETWEEN 31001 AND 31010;

-- 9) Seed transaksi hutang payment (8 baris)
INSERT INTO transaksi (
  id, created_at, customer_type, nis_siswa, nip_guru, transaction_type,
  payment_method, payment_status, order_status,
  amount_total, amount_paid, amount_due, note, metadata
)
SELECT
  'trx_hutangpay_siswa_' || nis::text AS id,
  NOW() - ((nis - 10995) || ' hours')::interval AS created_at,
  'siswa' AS customer_type,
  nis AS nis_siswa,
  NULL AS nip_guru,
  'hutang_payment' AS transaction_type,
  CASE WHEN nis % 2 = 0 THEN 'Tunai' ELSE 'Saldo' END AS payment_method,
  'Lunas' AS payment_status,
  NULL AS order_status,
  5000 + ((nis - 11000) * 300) AS amount_total,
  5000 + ((nis - 11000) * 300) AS amount_paid,
  0 AS amount_due,
  'Pembayaran hutang dummy siswa' AS note,
  '{"seed":"large","kind":"hutang_payment"}'::jsonb AS metadata
FROM siswa
WHERE nis BETWEEN 11001 AND 11008;

-- 10) Seed detail transaksi untuk semua order (2 item per order)
WITH order_rows AS (
  SELECT
    t.id,
    t.amount_total,
    ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn
  FROM transaksi t
  WHERE t.transaction_type = 'order'
)
INSERT INTO detail_transaksi (transaksi_id, produk_id, jumlah, harga_satuan, sub_total)
SELECT
  o.id AS transaksi_id,
  ((o.rn - 1) % 25) + 1 AS produk_id,
  1 AS jumlah,
  GREATEST(1000, (o.amount_total * 60) / 100) AS harga_satuan,
  GREATEST(1000, (o.amount_total * 60) / 100) AS sub_total
FROM order_rows o
UNION ALL
SELECT
  o.id AS transaksi_id,
  (o.rn % 25) + 1 AS produk_id,
  1 AS jumlah,
  GREATEST(1000, o.amount_total - GREATEST(1000, (o.amount_total * 60) / 100)) AS harga_satuan,
  GREATEST(1000, o.amount_total - GREATEST(1000, (o.amount_total * 60) / 100)) AS sub_total
FROM order_rows o;

-- 11) Seed saldo_log dari topup
INSERT INTO saldo_log (
  created_at, customer_type, nis_siswa, nip_guru, transaksi_id, log_type,
  amount, balance_before, balance_after, payment_method, note
)
SELECT
  t.created_at,
  t.customer_type,
  t.nis_siswa,
  t.nip_guru,
  t.id,
  'Top-up' AS log_type,
  t.amount_total,
  0 AS balance_before,
  t.amount_total AS balance_after,
  t.payment_method,
  'Log top-up dummy'
FROM transaksi t
WHERE t.transaction_type = 'topup';

-- 12) Seed saldo_log untuk order saldo (debit)
INSERT INTO saldo_log (
  created_at, customer_type, nis_siswa, nip_guru, transaksi_id, log_type,
  amount, balance_before, balance_after, payment_method, note
)
SELECT
  t.created_at,
  t.customer_type,
  t.nis_siswa,
  t.nip_guru,
  t.id,
  'Order_Saldo' AS log_type,
  -t.amount_total AS amount,
  t.amount_total + 50000 AS balance_before,
  50000 AS balance_after,
  'Saldo' AS payment_method,
  'Log order saldo dummy'
FROM transaksi t
WHERE t.transaction_type = 'order'
  AND t.payment_method = 'Saldo'
  AND t.payment_status = 'Lunas';

COMMIT;

-- 13) Verifikasi cepat
SELECT COUNT(*) AS total_siswa FROM siswa;
SELECT COUNT(*) AS total_guru FROM guru;
SELECT COUNT(*) AS total_produk FROM produk;
SELECT COUNT(*) AS total_transaksi FROM transaksi;
SELECT COUNT(*) AS total_detail_transaksi FROM detail_transaksi;
SELECT COUNT(*) AS total_saldo_log FROM saldo_log;
