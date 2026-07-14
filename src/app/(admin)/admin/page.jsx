"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import { CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar } from "recharts";
import useDashboardSummary, { PERIOD_OPTIONS } from "@/hooks/useDashboardSummary";
import "./dashboard.css";

const supabase = createClient();

export default function AdminDashboardPage() {
   const [period, setPeriod] = useState("1_week");
   const summary = useDashboardSummary(period);

   const [products, setProducts] = useState([]);
   const [transactions, setTransactions] = useState([]);
   const [ordersSiswa, setOrdersSiswa] = useState([]);
   const [ordersGuru, setOrdersGuru] = useState([]);
   const [detailTransactions, setDetailTransactions] = useState([]);
   const [detailOrdersSiswa, setDetailOrdersSiswa] = useState([]);
   const [detailOrdersGuru, setDetailOrdersGuru] = useState([]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const loadMetrics = async () => {
         setLoading(true);
         try {
            const now = new Date();
            let startDate;

            if (period === "1_week") {
               startDate = new Date(now);
               startDate.setDate(now.getDate() - 6);
            } else if (period === "1_month") {
               startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (period === "1_year") {
               startDate = new Date(now);
               startDate.setDate(now.getDate() - 364);
            } else {
               startDate = new Date(now);
            }
            startDate.setHours(0, 0, 0, 0);
            const startISO = startDate.toISOString();
            const endISO = now.toISOString();

            const [{ data: produkData }, { data: transaksiData }, { data: detailTransaksiData }, { data: orderSiswaData }, { data: detailOrderSiswaData }, { data: orderGuruData }, { data: detailOrderGuruData }] = await Promise.all([
               supabase.from("produk").select("id,nama_produk,stok,harga_beli,harga_jual").order("nama_produk", { ascending: true }),
               supabase
                  .from("transaksi")
                  .select("id,transaction_type,amount_total,amount_paid,payment_method,payment_status,created_at,nis_siswa,nip_guru")
                  .gte("created_at", startISO)
                  .lte("created_at", endISO)
                  .order("created_at", { ascending: false }),
               supabase.from("detail_transaksi").select("transaksi_id,produk_id,jumlah"),
               supabase
                  .from("order_siswa")
                  .select("id,total_harga,metode_pembayaran,status_order,status_pembayaran,created_at,nis_siswa")
                  .gte("created_at", startISO)
                  .lte("created_at", endISO)
                  .order("created_at", { ascending: false }),
               supabase.from("detail_order_siswa").select("order_id,produk_id,jumlah,harga_satuan"),
               supabase
                  .from("order_guru")
                  .select("id,total_harga,metode_pembayaran,status_order,status_pembayaran,created_at,nip_guru")
                  .gte("created_at", startISO)
                  .lte("created_at", endISO)
                  .order("created_at", { ascending: false }),
               supabase.from("detail_order_guru").select("order_id,produk_id,jumlah,harga_satuan"),
            ]);

            setProducts(produkData ?? []);
            setTransactions(transaksiData ?? []);
            setDetailTransactions(detailTransaksiData ?? []);
            setOrdersSiswa(orderSiswaData ?? []);
            setDetailOrdersSiswa(detailOrderSiswaData ?? []);
            setOrdersGuru(orderGuruData ?? []);
            setDetailOrdersGuru(detailOrderGuruData ?? []);
         } catch (err) {
            console.error(err);
         } finally {
            setLoading(false);
         }
      };

      void loadMetrics();
   }, [period]);

   const validTransactions = useMemo(() => {
      // Exclude debt-payment transactions from revenue/chart calculations
      return (transactions ?? []).filter((item) => item.payment_status === "Lunas" && item.transaction_type !== "hutang_payment");
   }, [transactions]);

   const confirmedOrders = useMemo(() => {
      return [...(ordersSiswa ?? []), ...(ordersGuru ?? [])]
         .filter((order) => order.status_order === "Dikonfirmasi")
         .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
   }, [ordersSiswa, ordersGuru]);

   const validDetailTransactions = useMemo(() => {
      const validIds = new Set((validTransactions ?? []).map((item) => item.id));
      return (detailTransactions ?? []).filter((item) => validIds.has(item.transaksi_id));
   }, [validTransactions, detailTransactions]);

   const salesTimeline = useMemo(() => {
      const entries = [
         ...validTransactions.map((item) => ({
            id: item.id,
            source: "transaksi",
            created_at: item.created_at,
            amount: Number(item.amount_total || 0),
            status: item.payment_status,
            method: item.payment_method,
            label: "Transaksi",
         })),
         ...confirmedOrders.map((item) => ({
            id: item.id,
            source: item.nis_siswa ? "order_siswa" : "order_guru",
            created_at: item.created_at,
            amount: Number(item.total_harga || 0),
            status: item.status_order,
            method: item.metode_pembayaran,
            label: item.nis_siswa ? "Order Siswa" : "Order Guru",
         })),
      ];

      return entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
   }, [validTransactions, confirmedOrders]);

   const salesChartData = useMemo(() => {
      // build chart data based on selected period
      const now = new Date();
      let startDate;

      if (period === "1_week") {
         startDate = new Date(now);
         startDate.setDate(now.getDate() - 6);
      } else if (period === "1_month") {
         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === "1_year") {
         startDate = new Date(now);
         startDate.setDate(now.getDate() - 364);
      } else {
         startDate = new Date(now);
      }
      startDate.setHours(0, 0, 0, 0);

      const map = new Map();
      const toKey = (d) => {
         const date = new Date(d);
         const y = date.getFullYear();
         const m = String(date.getMonth() + 1).padStart(2, "0");
         const dd = String(date.getDate()).padStart(2, "0");
         if (period === "1_year") {
            return `${y}-${m}`;
         }
         return `${y}-${m}-${dd}`;
      };

      const toLabel = (key) => {
         if (period === "1_year") {
            const [y, m] = key.split("-");
            const date = new Date(Number(y), Number(m) - 1, 1);
            return date.toLocaleString("id-ID", { month: "short", year: "numeric" });
         }
         const date = new Date(key);
         return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      };

      // Initialize continuous timeline keys
      const keys = [];
      if (period === "1_year") {
         const s = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
         const e = new Date(now.getFullYear(), now.getMonth(), 1);
         while (s <= e) {
            const key = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`;
            keys.push(key);
            s.setMonth(s.getMonth() + 1);
         }
      } else {
         const s = new Date(startDate);
         const e = new Date(now);
         while (s <= e) {
            const key = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
            keys.push(key);
            s.setDate(s.getDate() + 1);
         }
      }

      keys.forEach((k) => map.set(k, { label: toLabel(k), key: k, revenue: 0, count: 0 }));

      salesTimeline.forEach((entry) => {
         const created = new Date(entry.created_at);
         if (created < startDate) return;
         const key = toKey(created);
         const row = map.get(key);
         if (row) {
            row.revenue += Number(entry.amount || 0);
            row.count += 1;
         }
      });

      const data = Array.from(map.values());

      // compute 7-day moving average (or appropriate window)
      const window = 7;
      for (let i = 0; i < data.length; i++) {
         const start = Math.max(0, i - (window - 1));
         const slice = data.slice(start, i + 1);
         const sum = slice.reduce((s, v) => s + Number(v.revenue || 0), 0);
         data[i].ma = Math.round(sum / slice.length);
      }

      return data;
   }, [salesTimeline]);

   const totalItemsSold = useMemo(() => {
      const fromTransactions = validDetailTransactions.reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
      const fromOrders = confirmedOrders.reduce((sum, order) => {
         const details = [...(detailOrdersSiswa ?? []), ...(detailOrdersGuru ?? [])].filter((item) => item.order_id === order.id);
         return sum + details.reduce((subSum, item) => subSum + Number(item.jumlah || 0), 0);
      }, 0);
      return fromTransactions + fromOrders;
   }, [validDetailTransactions, confirmedOrders, detailOrdersSiswa, detailOrdersGuru]);

   const totalModal = useMemo(() => {
      const productMap = new Map((products ?? []).map((product) => [product.id, Number(product.harga_beli ?? product.harga ?? 0)]));
      let total = 0;

      validDetailTransactions.forEach((item) => {
         total += (productMap.get(item.produk_id) ?? 0) * Number(item.jumlah || 0);
      });

      confirmedOrders.forEach((order) => {
         const details = [...(detailOrdersSiswa ?? []), ...(detailOrdersGuru ?? [])].filter((item) => item.order_id === order.id);
         details.forEach((item) => {
            total += (productMap.get(item.produk_id) ?? 0) * Number(item.jumlah || 0);
         });
      });

      return total;
   }, [products, validDetailTransactions, confirmedOrders, detailOrdersSiswa, detailOrdersGuru]);

   const omzet = useMemo(() => salesTimeline.reduce((sum, item) => sum + Number(item.amount || 0), 0), [salesTimeline]);
   const labaKotor = useMemo(() => Math.max(0, omzet - totalModal), [omzet, totalModal]);
   const estimasiLabaBersih = useMemo(() => Math.max(0, labaKotor * 0.9), [labaKotor]);
   const avgOrderValue = useMemo(() => (salesTimeline.length ? omzet / salesTimeline.length : 0), [salesTimeline, omzet]);

   const topProducts = useMemo(() => {
      const map = new Map();
      const addItem = (item, price) => {
         const product = (products ?? []).find((entry) => entry.id === item.produk_id);
         if (!product) return;
         const existing = map.get(product.id) ?? { id: product.id, name: product.nama_produk, stock: Number(product.stok || 0), buyPrice: Number(product.harga_beli ?? product.harga ?? 0), sellPrice: Number(product.harga_jual ?? product.harga ?? 0), qty: 0, revenue: 0 };
         existing.qty += Number(item.jumlah || 0);
         existing.revenue += Number(price || 0) * Number(item.jumlah || 0);
         map.set(product.id, existing);
      };

      validDetailTransactions.forEach((item) => addItem(item, Number((products ?? []).find((product) => product.id === item.produk_id)?.harga_jual ?? 0)));
      confirmedOrders.forEach((order) => {
         [...(detailOrdersSiswa ?? []), ...(detailOrdersGuru ?? [])]
            .filter((item) => item.order_id === order.id)
            .forEach((item) => addItem(item, Number(item.harga_satuan || 0)));
      });

      return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 7);
   }, [products, validDetailTransactions, confirmedOrders, detailOrdersSiswa, detailOrdersGuru]);

   const lowStockProducts = useMemo(() => {
      return (products ?? []).filter((product) => Number(product.stok || 0) <= 5).sort((a, b) => Number(a.stok || 0) - Number(b.stok || 0));
   }, [products]);

   const latestActivity = useMemo(() => {
      const items = [
         ...validTransactions.map((item) => ({
            id: item.id,
            type: "Transaksi",
            label: `Transaksi • ${item.payment_method}`,
            created_at: item.created_at,
            amount: Number(item.amount_total || 0),
            status: item.payment_status,
         })),
         ...confirmedOrders.map((item) => ({
            id: item.id,
            type: item.nis_siswa ? "Order Siswa" : "Order Guru",
            label: `${item.nis_siswa ? "Order Siswa" : "Order Guru"} • ${item.metode_pembayaran}`,
            created_at: item.created_at,
            amount: Number(item.total_harga || 0),
            status: item.status_order,
         })),
      ];

      return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 7);
   }, [validTransactions, confirmedOrders]);

   const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

   return (
      <div className="admin-dashboard">
         <div className="admin-dashboard__header">
            <div>
               <h1 className="admin-dashboard__title">Dashboard Admin</h1>
               <p>Ringkasan penjualan, produk, dan pendapatan koperasi.</p>
            </div>
         </div>

         {loading ? (
            <Loading message="Memuat metrik..." size="small" />
         ) : (
            <>
               <section className="admin-dashboard__section">
                  <div className="admin-dashboard__section-header">
                     <div>
                        <h2 className="admin-dashboard__section-title">Ringkasan Penjualan</h2>
                        <p className="admin-dashboard__section-subtitle">Ikhtisar performa penjualan: {summary.periodLabel}</p>
                     </div>
                  </div>

                  {/* Period Filter Select */}
                  <div className="admin-dashboard__period-filter">
                     <select
                        className="admin-dashboard__period-select"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        disabled={summary.loading}
                     >
                        {Object.entries(PERIOD_OPTIONS).map(([key, config]) => (
                           <option key={key} value={key}>
                              {config.label}
                           </option>
                        ))}
                     </select>
                  </div>

                  {summary.loading ? (
                     <Loading message="Memuat ringkasan..." size="small" />
                  ) : (
                     <div className="admin-dashboard__summary-grid">
                        <div className="admin-dashboard__summary-card">
                           <div className="admin-dashboard__summary-label">Omzet</div>
                           <div className="admin-dashboard__summary-value">{formatCurrency(summary.omzet)}</div>
                           <div className="admin-dashboard__summary-caption">Total pendapatan yang sudah lunas / dikonfirmasi</div>
                        </div>
                        <div className="admin-dashboard__summary-card">
                           <div className="admin-dashboard__summary-label">Item Terjual</div>
                           <div className="admin-dashboard__summary-value">{summary.itemTerjual}</div>
                           <div className="admin-dashboard__summary-caption">Total quantity produk yang terjual</div>
                        </div>
                        <div className="admin-dashboard__summary-card">
                           <div className="admin-dashboard__summary-label">Transaksi</div>
                           <div className="admin-dashboard__summary-value">{summary.totalTransaksi}</div>
                           <div className="admin-dashboard__summary-caption">Jumlah pesanan yang berhasil dikonfirmasi</div>
                        </div>
                        <div className="admin-dashboard__summary-card">
                           <div className="admin-dashboard__summary-label">Laba Kotor</div>
                           <div className="admin-dashboard__summary-value">{formatCurrency(summary.labaKotor)}</div>
                           <div className="admin-dashboard__summary-caption">Omzet dikurangi harga pokok barang</div>
                        </div>
                     </div>
                  )}
               </section>

               <section className="admin-dashboard__section">
                  <div className="admin-dashboard__section-header">
                     <div>
                        <h2 className="admin-dashboard__section-title">Grafik Penjualan</h2>
                        <p className="admin-dashboard__section-subtitle">Perkembangan penjualan 7 hari terakhir.</p>
                     </div>
                  </div>
                  <div className="admin-dashboard__chart-wrap">
                     <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={salesChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="label" axisLine={false} tickLine={false} />
                           <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} />
                           <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} />
                           <Legend />
                           <Bar dataKey="revenue" name="Omzet" fill="#08d1d6" />
                           <Line type="monotone" dataKey="ma" name="Rata-rata 7 hari" stroke="#0e6ec6" strokeWidth={2} dot={false} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
               </section>

               <section className="admin-dashboard__section admin-dashboard__section--split">
                  <div className="admin-dashboard__panel">
                     <div className="admin-dashboard__section-header">
                        <div>
                           <h2 className="admin-dashboard__section-title">Produk Terlaris</h2>
                           <p className="admin-dashboard__section-subtitle">Produk dengan penjualan terbanyak selama {summary.periodLabel}.</p>
                        </div>
                     </div>
                     <div className="admin-dashboard__list">
                        {topProducts.length === 0 ? (
                           <div className="admin-dashboard__empty">Belum ada data penjualan.</div>
                        ) : (
                           topProducts.map((product, index) => (
                              <div key={product.id} className="admin-dashboard__list-item">
                                 <div>
                                    <div className="admin-dashboard__list-title">{index + 1}. {product.name}</div>
                                    <div className="admin-dashboard__list-meta">{product.qty} terjual • stok {product.stock}</div>
                                 </div>
                                 <div className="admin-dashboard__list-value">{formatCurrency(product.revenue)}</div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  <div className="admin-dashboard__panel">
                     <div className="admin-dashboard__section-header">
                        <div>
                           <h2 className="admin-dashboard__section-title">Transaksi Terbaru</h2>
                           <p className="admin-dashboard__section-subtitle">Aktivitas penjualan terakhir.</p>
                        </div>
                     </div>
                     <div className="admin-dashboard__list">
                        {latestActivity.length === 0 ? (
                           <div className="admin-dashboard__empty">Belum ada aktivitas terbaru.</div>
                        ) : (
                           latestActivity.map((item) => (
                              <div key={`${item.type}-${item.id}`} className="admin-dashboard__list-item">
                                 <div>
                                    <div className="admin-dashboard__list-title">{item.label}</div>
                                    <div className="admin-dashboard__list-meta">{new Date(item.created_at).toLocaleString("id-ID")}</div>
                                 </div>
                                 <div className="admin-dashboard__activity-meta">
                                    <div className="admin-dashboard__list-value">{formatCurrency(item.amount)}</div>
                                    <span className="admin-dashboard__pill">{item.status}</span>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </section>
            </>
         )}
      </div>
   );
}
