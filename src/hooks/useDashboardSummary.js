import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase';
import {
  DATE_FILTER_OPTIONS,
  getDateRangeByFilter,
  calculateAdminMetrics,
  buildSalesChartData,
} from '@/utils/admin-metrics';

const supabase = createClient();

/**
 * Period definitions
 */
export const PERIOD_OPTIONS = {
  '1_week': {
    label: DATE_FILTER_OPTIONS['1_week'].label,
    key: '1_week',
  },
  '1_month': {
    label: DATE_FILTER_OPTIONS['1_month'].label,
    key: '1_month',
  },
  '1_year': {
    label: DATE_FILTER_OPTIONS['1_year'].label,
    key: '1_year',
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
 * @param {string} period - One of: '1_week', '1_month', '1_year'
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
    return getDateRangeByFilter(period);
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

        const startISO = dateRange.startISO;
        const endISO = dateRange.endISO;
        transactionQuery = transactionQuery.gte('created_at', startISO);
        transactionQuery = transactionQuery.lte('created_at', endISO);
        orderSiswaQuery = orderSiswaQuery.gte('created_at', startISO);
        orderSiswaQuery = orderSiswaQuery.lte('created_at', endISO);
        orderGuruQuery = orderGuruQuery.gte('created_at', startISO);
        orderGuruQuery = orderGuruQuery.lte('created_at', endISO);

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

  const metrics = useMemo(() => {
    return calculateAdminMetrics({
      products,
      transactions,
      detailTransactions,
      ordersSiswa,
      detailOrdersSiswa,
      ordersGuru,
      detailOrdersGuru,
    });
  }, [products, transactions, detailTransactions, ordersSiswa, detailOrdersSiswa, ordersGuru, detailOrdersGuru]);

  const salesChartData = useMemo(() => {
    return buildSalesChartData(metrics.salesRows, period);
  }, [metrics.salesRows, period]);

  /**
   * Additional metrics (derived from primary metrics)
   */
  const avgOrderValue = useMemo(() => {
    return metrics.totalTransaksi > 0 ? metrics.omzet / metrics.totalTransaksi : 0;
  }, [metrics.omzet, metrics.totalTransaksi]);

  const estimasiLabaBersih = useMemo(() => {
    return Math.max(0, metrics.labaKotor * 0.9);
  }, [metrics.labaKotor]);

  return {
    // Primary metrics
    omzet: metrics.omzet,
    itemTerjual: metrics.itemTerjual,
    totalTransaksi: metrics.totalTransaksi,
    labaKotor: metrics.labaKotor,
    totalModal: metrics.totalModal,
    salesRows: metrics.salesRows,
    productSalesRows: metrics.productSalesRows,
    topProducts: metrics.topProducts,
    latestActivity: metrics.latestActivity,
    lowStockProducts: metrics.lowStockProducts,
    outOfStockProducts: metrics.outOfStockProducts,
    totalStok: metrics.totalStok,
    stockValue: metrics.stockValue,
    salesChartData,

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
