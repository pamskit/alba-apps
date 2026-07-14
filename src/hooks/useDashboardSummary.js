import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase';

const supabase = createClient();

/**
 * Period definitions
 */
export const PERIOD_OPTIONS = {
  '1_week': {
    label: '1 Minggu Terakhir',
    days: 7,
    key: '1_week',
  },
  '1_month': {
    label: '1 Bulan Terakhir',
    days: 30,
    key: '1_month',
  },
  '1_year': {
    label: '1 Tahun Terakhir',
    days: 365,
    key: '1_year',
  },
  all_time: {
    label: 'Semua Waktu',
    days: null,
    key: 'all_time',
  },
};

/**
 * useDashboardSummary Hook
 * 
 * Accumulates sales summary data:
 * - Omzet (Total Revenue)
 * - Item Terjual (Total Quantity)
 * - Transaksi (Transaction Count)
 * - Laba Kotor (Gross Profit)
 * 
 * Supports multiple period filters with automatic date range calculation
 * 
 * @param {string} period - One of: '1_week', '1_month', '1_year', 'all_time'
 * @returns {Object} Summary data: { omzet, itemTerjual, totalTransaksi, labaKotor, loading, error }
 */
export default function useDashboardSummary(period = '1_week') {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [detailTransactions, setDetailTransactions] = useState([]);
  const [ordersSiswa, setOrdersSiswa] = useState([]);
  const [detailOrdersSiswa, setDetailOrdersSiswa] = useState([]);
  const [ordersGuru, setOrdersGuru] = useState([]);
  const [detailOrdersGuru, setDetailOrdersGuru] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Calculate date range based on period
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const config = PERIOD_OPTIONS[period];

    if (!config.days) {
      // all_time: no filter
      return { start: null, end: now };
    }

    const start = new Date();
    start.setDate(start.getDate() - config.days);
    return { start, end: now };
  }, [period]);

  /**
   * Fetch all required data based on period
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build date filter query
        let transactionQuery = supabase.from('transaksi').select('id,amount_total,payment_status,order_status,transaction_type,created_at,nis_siswa,nip_guru');
        let detailTransactionQuery = supabase.from('detail_transaksi').select('transaksi_id,produk_id,jumlah,harga_satuan,sub_total');
        let orderSiswaQuery = supabase.from('order_siswa').select('id,total_harga,status_order,created_at,nis_siswa');
        let detailOrderSiswaQuery = supabase.from('detail_order_siswa').select('order_id,produk_id,jumlah,harga_satuan');
        let orderGuruQuery = supabase.from('order_guru').select('id,total_harga,status_order,created_at,nip_guru');
        let detailOrderGuruQuery = supabase.from('detail_order_guru').select('order_id,produk_id,jumlah,harga_satuan');

        // Apply date filters if not all_time
        if (dateRange.start) {
          const startISO = dateRange.start.toISOString();
          transactionQuery = transactionQuery.gte('created_at', startISO);
          orderSiswaQuery = orderSiswaQuery.gte('created_at', startISO);
          orderGuruQuery = orderGuruQuery.gte('created_at', startISO);
        }

        // Fetch products separately (no date filter needed)
        const [
          { data: produkData, error: produkError },
          { data: transaksiData, error: transaksiError },
          { data: detailTransaksiData, error: detailTransaksiError },
          { data: orderSiswaData, error: orderSiswaError },
          { data: detailOrderSiswaData, error: detailOrderSiswaError },
          { data: orderGuruData, error: orderGuruError },
          { data: detailOrderGuruData, error: detailOrderGuruError },
        ] = await Promise.all([
          supabase.from('produk').select('id,nama_produk,harga_beli,harga_jual,stok'),
          transactionQuery.order('created_at', { ascending: false }),
          detailTransactionQuery,
          orderSiswaQuery.order('created_at', { ascending: false }),
          detailOrderSiswaQuery,
          orderGuruQuery.order('created_at', { ascending: false }),
          detailOrderGuruQuery,
        ]);

        if (produkError || transaksiError || detailTransaksiError || orderSiswaError || detailOrderSiswaError || orderGuruError || detailOrderGuruError) {
          throw new Error('Failed to fetch data');
        }

        setProducts(produkData ?? []);
        setTransactions(transaksiData ?? []);
        setDetailTransactions(detailTransaksiData ?? []);
        setOrdersSiswa(orderSiswaData ?? []);
        setDetailOrdersSiswa(detailOrderSiswaData ?? []);
        setOrdersGuru(orderGuruData ?? []);
        setDetailOrdersGuru(detailOrderGuruData ?? []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, dateRange]);

  /**
   * Filter only "Lunas" transactions from transaksi table
   */
  const validTransactions = useMemo(() => {
    return (transactions ?? []).filter((item) => item.payment_status === 'Lunas');
  }, [transactions]);

  /**
   * Filter confirmed orders from legacy tables
   */
  const confirmedOrdersSiswa = useMemo(() => {
    return (ordersSiswa ?? []).filter((order) => order.status_order === 'Dikonfirmasi');
  }, [ordersSiswa]);

  const confirmedOrdersGuru = useMemo(() => {
    return (ordersGuru ?? []).filter((order) => order.status_order === 'Dikonfirmasi');
  }, [ordersGuru]);

  /**
   * METRIC 1: OMZET (Total Revenue)
   * Sum of all completed transactions' amount_total
   */
  const omzet = useMemo(() => {
    let total = 0;

    // From new transaksi table
    validTransactions.forEach((item) => {
      total += Number(item.amount_total || 0);
    });

    // From legacy order tables
    [...confirmedOrdersSiswa, ...confirmedOrdersGuru].forEach((order) => {
      total += Number(order.total_harga || 0);
    });

    return total;
  }, [validTransactions, confirmedOrdersSiswa, confirmedOrdersGuru]);

  /**
   * METRIC 2: ITEM TERJUAL (Total Quantity)
   * Sum of all items sold
   */
  const itemTerjual = useMemo(() => {
    let total = 0;

    // From new detail_transaksi table
    const validTransactionIds = new Set(validTransactions.map((t) => t.id));
    (detailTransactions ?? []).forEach((item) => {
      if (validTransactionIds.has(item.transaksi_id)) {
        total += Number(item.jumlah || 0);
      }
    });

    // From legacy detail_order tables
    [...confirmedOrdersSiswa, ...confirmedOrdersGuru].forEach((order) => {
      const details = order.nis_siswa
        ? (detailOrdersSiswa ?? []).filter((d) => d.order_id === order.id)
        : (detailOrdersGuru ?? []).filter((d) => d.order_id === order.id);
      details.forEach((item) => {
        total += Number(item.jumlah || 0);
      });
    });

    return total;
  }, [validTransactions, detailTransactions, confirmedOrdersSiswa, confirmedOrdersGuru, detailOrdersSiswa, detailOrdersGuru]);

  /**
   * METRIC 3: TRANSAKSI (Total Transaction Count)
   * Count of all unique transactions
   */
  const totalTransaksi = useMemo(() => {
    const newTableCount = validTransactions.length;
    const legacyCount = confirmedOrdersSiswa.length + confirmedOrdersGuru.length;
    return newTableCount + legacyCount;
  }, [validTransactions, confirmedOrdersSiswa, confirmedOrdersGuru]);

  /**
   * METRIC 4: LABA KOTOR (Gross Profit)
   * Formula: Sum(harga_jual × jumlah) - Sum(harga_beli × jumlah)
   * 
   * This is calculated from detail_transaksi and detail_order tables
   * joined with produk table for pricing
   */
  const labaKotor = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;

    // Create product map for quick lookup
    const productMap = new Map(
      (products ?? []).map((p) => [p.id, { harga_beli: Number(p.harga_beli || 0), harga_jual: Number(p.harga_jual || 0) }])
    );

    // From new detail_transaksi table
    const validTransactionIds = new Set(validTransactions.map((t) => t.id));
    (detailTransactions ?? []).forEach((item) => {
      if (validTransactionIds.has(item.transaksi_id)) {
        const product = productMap.get(item.produk_id);
        if (product) {
          const jumlah = Number(item.jumlah || 0);
          totalRevenue += Number(item.sub_total || 0); // harga_jual × jumlah
          totalCost += product.harga_beli * jumlah;
        }
      }
    });

    // From legacy detail_order tables
    [...confirmedOrdersSiswa, ...confirmedOrdersGuru].forEach((order) => {
      const details = order.nis_siswa
        ? (detailOrdersSiswa ?? []).filter((d) => d.order_id === order.id)
        : (detailOrdersGuru ?? []).filter((d) => d.order_id === order.id);

      details.forEach((item) => {
        const product = productMap.get(item.produk_id);
        if (product) {
          const jumlah = Number(item.jumlah || 0);
          const hargaSatuan = Number(item.harga_satuan || 0);
          totalRevenue += hargaSatuan * jumlah;
          totalCost += product.harga_beli * jumlah;
        }
      });
    });

    return Math.max(0, totalRevenue - totalCost);
  }, [products, validTransactions, detailTransactions, confirmedOrdersSiswa, confirmedOrdersGuru, detailOrdersSiswa, detailOrdersGuru]);

  /**
   * Additional metrics (derived from primary metrics)
   */
  const avgOrderValue = useMemo(() => {
    return totalTransaksi > 0 ? omzet / totalTransaksi : 0;
  }, [omzet, totalTransaksi]);

  const estimasiLabaBersih = useMemo(() => {
    return Math.max(0, labaKotor * 0.9);
  }, [labaKotor]);

  return {
    // Primary metrics
    omzet,
    itemTerjual,
    totalTransaksi,
    labaKotor,

    // Additional metrics
    avgOrderValue,
    estimasiLabaBersih,

    // State
    loading,
    error,

    // Config
    period,
    dateRange,
    periodLabel: PERIOD_OPTIONS[period]?.label,
  };
}
