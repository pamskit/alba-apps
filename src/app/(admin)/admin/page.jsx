"use client";

import { useState } from "react";
import Loading from "@/components/Loading";
import {
   CartesianGrid,
   Legend,
   Line,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
   ComposedChart,
   Bar,
} from "recharts";
import useDashboardSummary, { PERIOD_OPTIONS } from "@/hooks/useDashboardSummary";
import "./dashboard.css";

export default function AdminDashboardPage() {
   const [period, setPeriod] = useState("1_week");
   const summary = useDashboardSummary(period);

   const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

   return (
      <div className="admin-dashboard">
         <div className="admin-dashboard__header">
            <div>
               <h1 className="admin-dashboard__title">Dashboard Admin</h1>
               <p>Ringkasan penjualan, produk, dan pendapatan koperasi.</p>
            </div>
         </div>

         <section className="admin-dashboard__section">
            <div className="admin-dashboard__section-header">
               <div>
                  <h2 className="admin-dashboard__section-title">Ringkasan Penjualan</h2>
                  <p className="admin-dashboard__section-subtitle">Ikhtisar performa penjualan: {summary.periodLabel}</p>
               </div>
            </div>

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
                     <div className="admin-dashboard__summary-caption">Berdasarkan revenue historis detail transaksi</div>
                  </div>
               </div>
            )}
         </section>

         {summary.loading ? (
            <Loading message="Memuat metrik..." size="small" />
         ) : (
            <>
               <section className="admin-dashboard__section">
                  <div className="admin-dashboard__section-header">
                     <div>
                        <h2 className="admin-dashboard__section-title">Grafik Penjualan</h2>
                        <p className="admin-dashboard__section-subtitle">Perkembangan penjualan sesuai periode terpilih.</p>
                     </div>
                  </div>
                  <div className="admin-dashboard__chart-wrap">
                     <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={summary.salesChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="label" axisLine={false} tickLine={false} />
                           <YAxis
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`}
                           />
                           <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} />
                           <Legend />
                           <Bar dataKey="revenue" name="Omzet" fill="#08d1d6" />
                           <Line type="monotone" dataKey="ma" name="Rata-rata 7 periode" stroke="#0e6ec6" strokeWidth={2} dot={false} />
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
                        {summary.topProducts.length === 0 ? (
                           <div className="admin-dashboard__empty">Belum ada data penjualan.</div>
                        ) : (
                           summary.topProducts.map((product, index) => (
                              <div key={product.id} className="admin-dashboard__list-item">
                                 <div>
                                    <div className="admin-dashboard__list-title">
                                       {index + 1}. {product.name}
                                    </div>
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
                        {summary.latestActivity.length === 0 ? (
                           <div className="admin-dashboard__empty">Belum ada aktivitas terbaru.</div>
                        ) : (
                           summary.latestActivity.map((item) => (
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
