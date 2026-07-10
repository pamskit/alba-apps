"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import {
   LineChart,
   Line,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   CartesianGrid,
} from "recharts";
import "./laporan.css";

const supabase = createClient();

const FILTER_OPTIONS = {
   today: "Hari Ini",
   month: "Bulan Ini",
};

const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
const formatDate = (value) => {
   if (!value) return "-";
   return new Date(value).toLocaleString("id-ID");
};

export default function PengurusLaporanPage() {
   const [filter, setFilter] = useState("today");
   const [summary, setSummary] = useState({
      totalRevenue: 0,
      totalTransactions: 0,
      totalOrders: 0,
      totalHutang: 0,
   });
   const [rows, setRows] = useState([]);
   const [chartData, setChartData] = useState([]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const loadData = async () => {
         setLoading(true);
         try {
            const now = new Date();
            const startDate = filter === "month"
               ? new Date(now.getFullYear(), now.getMonth(), 1)
               : new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const start = startDate.toISOString();
            const end = now.toISOString();

            const [transaksiRes, orderSiswaRes, orderGuruRes, siswaRes, guruRes] = await Promise.all([
               supabase.from("transaksi").select("id,total_bayar,status_pembayaran,created_at").gte("created_at", start).lte("created_at", end),
               supabase.from("order_siswa").select("id,total_harga,status_order,status_pembayaran,created_at").gte("created_at", start).lte("created_at", end),
               supabase.from("order_guru").select("id,total_harga,status_order,status_pembayaran,created_at").gte("created_at", start).lte("created_at", end),
               supabase.from("siswa").select("saldo,total_hutang").not("saldo", "is", null),
               supabase.from("guru").select("saldo,total_hutang").not("saldo", "is", null),
            ]);

            if (transaksiRes.error) throw transaksiRes.error;
            if (orderSiswaRes.error) throw orderSiswaRes.error;
            if (orderGuruRes.error) throw orderGuruRes.error;
            if (siswaRes.error) throw siswaRes.error;
            if (guruRes.error) throw guruRes.error;

            const validTransactions = (transaksiRes.data ?? []).filter((item) => item.status_pembayaran === "Lunas");
            const validOrders = [
               ...(orderSiswaRes.data ?? []).filter((item) => item.status_order === "Dikonfirmasi" && item.status_pembayaran === "Lunas"),
               ...(orderGuruRes.data ?? []).filter((item) => item.status_order === "Dikonfirmasi" && item.status_pembayaran === "Lunas"),
            ];

            const totalRevenue = validTransactions.reduce((sum, item) => sum + Number(item.total_bayar || 0), 0) + validOrders.reduce((sum, item) => sum + Number(item.total_harga || 0), 0);
            const totalTransactions = validTransactions.length + validOrders.length;
            const totalHutang = (siswaRes.data ?? []).reduce((sum, item) => sum + Number(item.total_hutang || 0), 0) + (guruRes.data ?? []).reduce((sum, item) => sum + Number(item.total_hutang || 0), 0);

            const reportRows = [
               ...validTransactions.map((item) => ({
                  type: "Transaksi Kasir",
                  tanggal: item.created_at,
                  total: Number(item.total_bayar || 0),
               })),
               ...validOrders.map((item) => ({
                  type: "Order",
                  tanggal: item.created_at,
                  total: Number(item.total_harga || 0),
               })),
            ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

            const groupedByDate = [...reportRows].reduce((acc, item) => {
               const dateKey = new Date(item.tanggal).toLocaleDateString("id-ID");
               const existing = acc.find((row) => row.date === dateKey);
               if (existing) {
                  existing.total += item.total;
               } else {
                  acc.push({ date: dateKey, total: item.total });
               }
               return acc;
            }, []);

            const orderedChartData = groupedByDate.sort((a, b) => new Date(a.date) - new Date(b.date));

            setSummary({
               totalRevenue,
               totalTransactions,
               totalOrders: validOrders.length,
               totalHutang,
            });
            setRows(reportRows);
            setChartData(orderedChartData);
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };

      void loadData();
   }, [filter]);

   const summaryCards = useMemo(() => [
      { label: "Omzet", value: formatCurrency(summary.totalRevenue) },
      { label: "Transaksi", value: summary.totalTransactions },
      { label: "Order Terkonfirmasi", value: summary.totalOrders },
      { label: "Hutang Belum Lunas", value: formatCurrency(summary.totalHutang) },
   ], [summary]);

   function exportReportToCsv() {
      const now = new Date();
      const periodLabel = filter === "month" ? "bulan_ini" : "hari_ini";
      const rowsCsv = [];

      rowsCsv.push(["LAPORAN PENGURUS"]);
      rowsCsv.push(["Nama Lembaga", "Koperasi Sekolah"]);
      rowsCsv.push(["Judul Laporan", "Laporan Penjualan Pengurus"]);
      rowsCsv.push(["Periode", FILTER_OPTIONS[filter] || filter]);
      rowsCsv.push(["Tanggal Cetak", now.toLocaleString("id-ID")]);
      rowsCsv.push([]);
      rowsCsv.push(["RINGKASAN"]);
      rowsCsv.push(["Item", "Nilai"]);
      rowsCsv.push(["Omzet", formatCurrency(summary.totalRevenue)]);
      rowsCsv.push(["Transaksi", summary.totalTransactions]);
      rowsCsv.push(["Order Terkonfirmasi", summary.totalOrders]);
      rowsCsv.push(["Hutang Belum Lunas", formatCurrency(summary.totalHutang)]);
      rowsCsv.push([]);
      rowsCsv.push(["LAPORAN PENJUALAN"]);
      rowsCsv.push(["Tanggal", "Jenis", "Total"]);
      rows.forEach((item) => {
         rowsCsv.push([formatDate(item.tanggal), item.type, formatCurrency(item.total)]);
      });

      const csvContent = rowsCsv
         .map((row) =>
            row
               .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
               .join(",")
         )
         .join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan_pengurus_${periodLabel}_${now.toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
   }

   function handleExportPdf() {
      const printWindow = window.open("", "_blank", "width=1200,height=900");
      if (!printWindow) {
         alert("Popup diblokir. Izinkan popup untuk mencetak laporan.");
         return;
      }

      const escapeHtml = (value) =>
         String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

      const buildRowsHtml = (rowsData) =>
         rowsData
            .map(
               (row) => `
            <tr>
              ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
            </tr>`
            )
            .join("");

      const summaryRows = [
         ["Omzet", formatCurrency(summary.totalRevenue)],
         ["Transaksi", summary.totalTransactions],
         ["Order Terkonfirmasi", summary.totalOrders],
         ["Hutang Belum Lunas", formatCurrency(summary.totalHutang)],
      ];

      const salesRows = rows.map((item) => [formatDate(item.tanggal), item.type, formatCurrency(item.total)]);

      const html = `<!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Laporan Pengurus</title>
          <style>
            :root { color-scheme: light; }
            body { margin: 0; padding: 24px; font-family: "Segoe UI", Arial, sans-serif; color: #111827; background: #ffffff; }
            .page { max-width: 210mm; margin: 0 auto; padding: 24px; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand-badge { width: 44px; height: 44px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
            .title { margin: 0; font-size: 18px; font-weight: 800; }
            .subtitle { margin: 6px 0 0; color: #64748b; font-size: 12px; }
            .meta { text-align: right; font-size: 11px; color: #475569; }
            .section { margin-top: 20px; }
            .section-title { margin: 0 0 10px; font-size: 13px; font-weight: 800; color: #0f172a; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .summary-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
            .summary-label { font-size: 10px; color: #64748b; }
            .summary-value { margin-top: 4px; font-size: 13px; font-weight: 700; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: 700; }
            @media print { body { padding: 0; } .page { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <div class="brand-badge">KS</div>
                <div>
                  <h1 class="title">Koperasi Sekolah</h1>
                  <p class="subtitle">Laporan Pengurus</p>
                </div>
              </div>
              <div class="meta">
                <div><strong>Periode:</strong> ${escapeHtml(FILTER_OPTIONS[filter] || filter)}</div>
                <div><strong>Tanggal Cetak:</strong> ${escapeHtml(new Date().toLocaleString("id-ID"))}</div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Ringkasan</h2>
              <div class="summary-grid">
                ${summaryRows
            .map(
               ([label, value]) =>
                  `<div class="summary-card"><div class="summary-label">${escapeHtml(label)}</div><div class="summary-value">${escapeHtml(value)}</div></div>`
            )
            .join("")}
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Laporan Penjualan</h2>
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildRowsHtml(salesRows)}
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
   }

   return (
      <div className="admin-dashboard">
         <div className="laporan-page__header">
            <div>
               <h1 className="laporan-page__title">Laporan Pengurus</h1>
               <p className="laporan-page__subtitle">Ringkasan laporan penjualan dan hutang untuk pengurus.</p>
            </div>
            <div className="laporan-page__filter">
               <label className="laporan-page__label" htmlFor="filter-time">
                  Periode
               </label>
               <select id="filter-time" className="laporan-page__select" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="today">Hari Ini</option>
                  <option value="month">Bulan Ini</option>
               </select>
               <button type="button" className="btn btn--secondary laporan-page__button" onClick={exportReportToCsv}>
                  Export CSV
               </button>
               <button type="button" className="btn btn--secondary laporan-page__button" onClick={handleExportPdf}>
                  Export PDF
               </button>
            </div>
         </div>

         {loading ? (
            <Loading message="Memuat laporan pengurus..." size="large" />
         ) : (
            <>
               <section className="admin-dashboard__section">
                  <div className="admin-dashboard__summary-grid">
                     {summaryCards.map((card) => (
                        <div key={card.label} className="admin-dashboard__summary-card">
                           <div className="admin-dashboard__summary-label">{card.label}</div>
                           <div className="admin-dashboard__summary-value">{card.value}</div>
                        </div>
                     ))}
                  </div>
               </section>

               <section className="admin-dashboard__section">
                  <div className="admin-dashboard__section-header">
                     <h2 className="admin-dashboard__section-title">Grafik Penjualan</h2>
                     <p className="admin-dashboard__section-subtitle">Perkembangan omzet berdasarkan hari.</p>
                  </div>
                  <div className="laporan-chart">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                           <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 12 }} />
                           <YAxis tickFormatter={(value) => `Rp ${value.toLocaleString("id-ID")}`} tick={{ fill: "#475569", fontSize: 12 }} />
                           <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Tanggal: ${label}`} />
                           <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </section>

               <section className="admin-dashboard__section">
                  <div className="admin-dashboard__section-header">
                     <h2 className="admin-dashboard__section-title">Laporan Penjualan</h2>
                     <p className="admin-dashboard__section-subtitle">Data penjualan yang masuk dalam periode yang dipilih.</p>
                  </div>
                  <div className="admin-dashboard__list">
                     {rows.length === 0 ? (
                        <div className="admin-dashboard__empty">Belum ada data laporan untuk periode ini.</div>
                     ) : (
                        rows.map((row, index) => (
                           <div key={`${row.type}-${row.tanggal}-${index}`} className="admin-dashboard__list-item">
                              <div>
                                 <div className="admin-dashboard__list-title">{row.type}</div>
                                 <div className="admin-dashboard__list-meta">{formatDate(row.tanggal)}</div>
                              </div>
                              <div className="admin-dashboard__list-value">{formatCurrency(row.total)}</div>
                           </div>
                        ))
                     )}
                  </div>
               </section>
            </>
         )}
      </div>
   );
}
