"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import { toast } from "react-hot-toast";
import { DATE_FILTER_OPTIONS, getDateRangeByFilter, calculateAdminMetrics } from "@/utils/admin-metrics";
import "./laporan.css";

const supabase = createClient();

const FILTER_OPTIONS = {
   today: DATE_FILTER_OPTIONS.today.label,
   week: DATE_FILTER_OPTIONS.week.label,
   month: DATE_FILTER_OPTIONS.month.label,
};

const formatCurrency = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const formatDate = (value) => {
   if (!value) return "-";
   return new Date(value).toLocaleString("id-ID");
};

const toToneClass = (value = "") => {
   const normalized = String(value).toLowerCase();
   if (normalized.includes("kasir")) return "report-pill report-pill--info";
   if (normalized.includes("siswa")) return "report-pill report-pill--warning";
   if (normalized.includes("guru")) return "report-pill report-pill--accent";
   if (normalized.includes("lunas") || normalized.includes("dikonfirmasi")) return "report-pill report-pill--success";
   if (normalized.includes("saldo")) return "report-pill report-pill--primary";
   if (normalized.includes("tunai")) return "report-pill report-pill--neutral";
   return "report-pill";
};

const isValidTransaction = (item) => item.payment_status === "Lunas" && item.transaction_type !== "hutang_payment";
const isValidOrder = (item) => item.status_order === "Dikonfirmasi";

export default function LaporanPage() {
   const [filter, setFilter] = useState("today");
   const [products, setProducts] = useState([]);
   const [transactions, setTransactions] = useState([]);
   const [orders, setOrders] = useState([]);
   const [ordersGuru, setOrdersGuru] = useState([]);
   const [detailTransactions, setDetailTransactions] = useState([]);
   const [detailOrders, setDetailOrders] = useState([]);
   const [detailOrdersGuru, setDetailOrdersGuru] = useState([]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const loadData = async () => {
         setLoading(true);
         try {
            const { startISO: start, endISO: end } = getDateRangeByFilter(filter);

            const [productRes, transactionRes, orderRes, orderGuruRes] = await Promise.all([
               supabase.from("produk").select("id,nama_produk,stok,harga_beli,harga_jual").order("nama_produk", { ascending: true }),
               supabase
                  .from("transaksi")
                  .select("id,transaction_type, nis_siswa, nip_guru, payment_method, payment_status, amount_total, created_at")
                  .gte("created_at", start)
                  .lte("created_at", end)
                  .order("created_at", { ascending: false }),
               supabase
                  .from("order_siswa")
                  .select("id, nis_siswa, metode_pembayaran, status_order, status_pembayaran, total_harga, created_at")
                  .gte("created_at", start)
                  .lte("created_at", end)
                  .order("created_at", { ascending: false }),
               supabase
                  .from("order_guru")
                  .select("id, nip_guru, metode_pembayaran, status_order, status_pembayaran, total_harga, created_at")
                  .gte("created_at", start)
                  .lte("created_at", end)
                  .order("created_at", { ascending: false }),
            ]);

            if (productRes.error) throw productRes.error;
            if (transactionRes.error) throw transactionRes.error;
            if (orderRes.error) throw orderRes.error;
            if (orderGuruRes.error) throw orderGuruRes.error;

            const transactionIds = (transactionRes.data ?? []).map((item) => item.id);
            const orderIds = (orderRes.data ?? []).map((item) => item.id);
            const orderGuruIds = (orderGuruRes.data ?? []).map((item) => item.id);

            const [detailTransactionRes, detailOrderRes, detailOrderGuruRes] = await Promise.all([
               transactionIds.length
                  ? supabase.from("detail_transaksi").select("transaksi_id, produk_id, jumlah, harga_satuan, sub_total").in("transaksi_id", transactionIds)
                  : Promise.resolve({ data: [], error: null }),
               orderIds.length
                  ? supabase.from("detail_order_siswa").select("order_id, produk_id, jumlah, harga_satuan").in("order_id", orderIds)
                  : Promise.resolve({ data: [], error: null }),
               orderGuruIds.length
                  ? supabase.from("detail_order_guru").select("order_id, produk_id, jumlah, harga_satuan").in("order_id", orderGuruIds)
                  : Promise.resolve({ data: [], error: null }),
            ]);

            if (detailTransactionRes.error) throw detailTransactionRes.error;
            if (detailOrderRes.error) throw detailOrderRes.error;
            if (detailOrderGuruRes.error) throw detailOrderGuruRes.error;

            setProducts(productRes.data ?? []);
            setTransactions(transactionRes.data ?? []);
            setOrders(orderRes.data ?? []);
            setOrdersGuru(orderGuruRes.data ?? []);
            setDetailTransactions(detailTransactionRes.data ?? []);
            setDetailOrders(detailOrderRes.data ?? []);
            setDetailOrdersGuru(detailOrderGuruRes.data ?? []);
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };

      void loadData();
   }, [filter]);

   const validTransactions = useMemo(() => (transactions ?? []).filter(isValidTransaction), [transactions]);
   const validOrders = useMemo(() => (orders ?? []).filter(isValidOrder), [orders]);
   const validOrdersGuru = useMemo(() => (ordersGuru ?? []).filter(isValidOrder), [ordersGuru]);

   const reportData = useMemo(() => {
      const metrics = calculateAdminMetrics({
         products,
         transactions,
         detailTransactions,
         ordersSiswa: orders,
         detailOrdersSiswa: detailOrders,
         ordersGuru,
         detailOrdersGuru,
      });

      return {
         salesRows: metrics.salesRows.map((item) => ({
            id: item.id,
            type: item.type,
            tanggal: item.created_at,
            pelanggan: item.pelanggan,
            metode: item.metode,
            status: item.status,
            total: item.total,
         })),
         productSalesRows: metrics.productSalesRows,
         omzet: metrics.omzet,
         totalRevenue: metrics.omzet,
         totalModal: metrics.totalModal,
         labaKotor: metrics.labaKotor,
         totalLaba: metrics.labaKotor,
         itemTerjual: metrics.itemTerjual,
         totalTransactions: metrics.totalTransaksi,
         totalStok: metrics.totalStok,
         stockValue: metrics.stockValue,
         outOfStockProducts: metrics.outOfStockProducts,
         lowStockProducts: metrics.lowStockProducts,
      };
   }, [products, transactions, detailTransactions, orders, detailOrders, ordersGuru, detailOrdersGuru]);

   function exportReportToCsv() {
      const now = new Date();
      const periodLabel = filter === "month" ? "bulan_ini" : filter === "week" ? "minggu_ini" : "hari_ini";
      const rows = [];

      rows.push(["LAPORAN KOPERASI"]);
      rows.push(["Nama Lembaga", "Koperasi Sekolah"]);
      rows.push(["Judul Laporan", "Laporan Keuangan dan Persediaan"]);
      rows.push(["Periode", FILTER_OPTIONS[filter] || filter]);
      rows.push(["Tanggal Cetak", now.toLocaleString("id-ID")]);
      rows.push(["Dibuat Oleh", "Sistem Aplikasi Koperasi"]);
      rows.push([]);
      rows.push(["RINGKASAN"]);
      rows.push(["Item", "Nilai"]);
      rows.push(["Omzet", formatCurrency(reportData.omzet)]);
      rows.push(["Item Terjual", reportData.itemTerjual]);
      rows.push(["Jumlah Transaksi", reportData.totalTransactions]);
      rows.push(["Laba Kotor", formatCurrency(reportData.labaKotor)]);
      rows.push(["Total Stok Unit", reportData.totalStok]);
      rows.push(["Nilai Stok", formatCurrency(reportData.stockValue)]);
      rows.push(["Produk Kosong", reportData.outOfStockProducts.length]);
      rows.push(["Produk Menipis", reportData.lowStockProducts.length]);
      rows.push([]);
      rows.push(["LAPORAN PENJUALAN"]);
      rows.push(["Tanggal", "Jenis", "Pelanggan", "Metode", "Status", "Total"]);
      reportData.salesRows.forEach((item) => {
         rows.push([formatDate(item.tanggal), item.type, item.pelanggan, item.metode, item.status, formatCurrency(item.total)]);
      });
      rows.push([]);
      rows.push(["LAPORAN PRODUK TERJUAL"]);
      rows.push(["Produk", "Qty Terjual", "Pendapatan", "Modal", "Laba"]);
      reportData.productSalesRows.forEach((item) => {
         rows.push([item.name, item.qty, formatCurrency(item.revenue), formatCurrency(item.modal), formatCurrency(item.laba)]);
      });
      rows.push([]);
      rows.push(["LAPORAN STOK"]);
      rows.push(["Produk", "Stok", "Harga Beli", "Harga Jual", "Status"]);
      products.forEach((item) => {
         const stok = Number(item.stok || 0);
         let status = "Cukup";
         if (stok === 0) status = "Habis";
         else if (stok <= 5) status = "Menipis";
         rows.push([item.nama_produk, stok, formatCurrency(item.harga_beli || 0), formatCurrency(item.harga_jual || 0), status]);
      });
      rows.push([]);
      rows.push(["LAPORAN LABA"]);
      rows.push(["Jenis", "Nilai"]);
      rows.push(["Omzet", formatCurrency(reportData.omzet)]);
      rows.push(["Modal", formatCurrency(reportData.totalModal)]);
      rows.push(["Laba Kotor", formatCurrency(reportData.labaKotor)]);
      rows.push(["Margin", `${reportData.omzet > 0 ? ((reportData.labaKotor / reportData.omzet) * 100).toFixed(1) : 0}%`]);

      const csvContent = rows
         .map((row) =>
            row
               .map((cell) => {
                  if (typeof cell === "string") {
                     return `"${cell.replace(/"/g, '""')}"`;
                  }
                  return `"${String(cell)}"`;
               })
               .join(",")
         )
         .join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan_koperasi_${periodLabel}_${now.toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
   }

   function handleExportPdf() {
      const printWindow = window.open("", "_blank", "width=1200,height=900");
      if (!printWindow) {
         toast.error("Popup diblokir. Izinkan popup untuk mencetak laporan.");
         return;
      }

      const escapeHtml = (value) =>
         String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

      const buildRowsHtml = (rows) =>
         rows
            .map(
               (row) => `
               <tr>
                  ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
               </tr>`
            )
            .join("");

      const summaryRows = [
         ["Omzet", formatCurrency(reportData.omzet)],
         ["Total Modal", formatCurrency(reportData.totalModal)],
         ["Laba Kotor", formatCurrency(reportData.labaKotor)],
         ["Total Stok Unit", reportData.totalStok],
         ["Nilai Stok", formatCurrency(reportData.stockValue)],
      ];

      const salesRows = reportData.salesRows.map((item) => [
         formatDate(item.tanggal),
         item.type,
         item.pelanggan,
         item.metode,
         item.status,
         formatCurrency(item.total),
      ]);

      const productRows = reportData.productSalesRows.map((item) => [
         item.name,
         item.qty,
         formatCurrency(item.revenue),
         formatCurrency(item.modal),
         formatCurrency(item.laba),
      ]);

      const stockRows = products.map((item) => {
         const stok = Number(item.stok || 0);
         let status = "Cukup";
         if (stok === 0) status = "Habis";
         else if (stok <= 5) status = "Menipis";
         return [item.nama_produk, stok, formatCurrency(item.harga_beli || 0), formatCurrency(item.harga_jual || 0), status];
      });

      const profitRows = [
         ["Omzet", formatCurrency(reportData.omzet)],
         ["Modal", formatCurrency(reportData.totalModal)],
         ["Laba Kotor", formatCurrency(reportData.labaKotor)],
         ["Margin", `${reportData.omzet > 0 ? ((reportData.labaKotor / reportData.omzet) * 100).toFixed(1) : 0}%`],
      ];

      const html = `<!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Laporan Koperasi</title>
          <style>
            :root { color-scheme: light; }
            body {
              margin: 0;
              padding: 24px;
              font-family: "Segoe UI", Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .page {
              max-width: 210mm;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 24px;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
              padding-bottom: 16px;
              border-bottom: 2px solid #0f172a;
              margin-bottom: 18px;
            }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand-badge {
              width: 44px; height: 44px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800;
            }
            .title { margin: 0; font-size: 18px; font-weight: 800; }
            .subtitle { margin: 3px 0 0; color: #64748b; font-size: 12px; }
            .meta { text-align: right; font-size: 11px; color: #475569; }
            .section { margin-top: 18px; break-inside: avoid; }
            .section-title { margin: 0 0 10px; font-size: 13px; font-weight: 800; color: #0f172a; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .summary-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
            .summary-label { font-size: 10px; color: #64748b; }
            .summary-value { margin-top: 4px; font-size: 13px; font-weight: 700; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 7px 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-weight: 700; }
            .foot { margin-top: 22px; display: flex; justify-content: space-between; gap: 24px; font-size: 10px; color: #475569; }
            .signature-line { width: 180px; border-bottom: 1px solid #111827; margin-top: 30px; }
            @media print { body { padding: 0; } .page { border: none; border-radius: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <div class="brand-badge">KS</div>
                <div>
                  <h1 class="title">Koperasi Sekolah</h1>
                  <p class="subtitle">Laporan Keuangan dan Persediaan</p>
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
                ${summaryRows.map(([label, value]) => ` <div class="summary-card"><div class="summary-label">${escapeHtml(label)}</div><div class="summary-value">${escapeHtml(value)}</div></div>`).join("")}
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">1. Laporan Penjualan</h2>
              <table>
                <thead><tr><th>Tanggal</th><th>Jenis</th><th>Pelanggan</th><th>Metode</th><th>Status</th><th>Total</th></tr></thead>
                <tbody>${buildRowsHtml(salesRows)}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">2. Laporan Produk Terjual</h2>
              <table>
                <thead><tr><th>Produk</th><th>Qty</th><th>Pendapatan</th><th>Modal</th><th>Laba</th></tr></thead>
                <tbody>${buildRowsHtml(productRows)}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">3. Laporan Stok</h2>
              <table>
                <thead><tr><th>Produk</th><th>Stok</th><th>Harga Beli</th><th>Harga Jual</th><th>Status</th></tr></thead>
                <tbody>${buildRowsHtml(stockRows)}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">4. Laporan Laba</h2>
              <table>
                <thead><tr><th>Jenis</th><th>Nilai</th></tr></thead>
                <tbody>${buildRowsHtml(profitRows)}</tbody>
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
      <div className="laporan-page">
         <div className="laporan-page__header">
            <div>
               <h1 className="laporan-page__title">Laporan Koperasi</h1>
               <p className="laporan-page__subtitle">
                  Ringkasan penjualan, produk terjual, stok, modal pembelian, dan laba berdasarkan data yang tercatat di database.
               </p>
            </div>

            <div className="laporan-page__filter">
               <div className="laporan-page__filter-left">
                  <label className="laporan-page__label" htmlFor="filter-time">
                     Periode
                  </label>
                  <select
                     id="filter-time"
                     className="laporan-page__select"
                     value={filter}
                     onChange={(e) => setFilter(e.target.value)}
                  >
                     <option value="today">{FILTER_OPTIONS.today}</option>
                     <option value="week">{FILTER_OPTIONS.week}</option>
                     <option value="month">{FILTER_OPTIONS.month}</option>
                  </select>
               </div>

               <div className="laporan-page__filter-right">
                  <button className="btn btn--secondary laporan-page__button" onClick={exportReportToCsv}>
                     Export CSV
                  </button>
                  <button className="btn btn--secondary laporan-page__button" onClick={handleExportPdf}>
                     Export PDF
                  </button>
               </div>
            </div>
         </div>

         {loading ? (
            <Loading message="Memuat laporan..." size="small" />
         ) : (
            <>
               <div className="report-print-header">
                  <div className="report-print-header__brand">
                     <div className="report-print-header__badge">KS</div>
                     <div>
                        <h2 className="report-print-header__title">Koperasi Sekolah</h2>
                        <p className="report-print-header__subtitle">Laporan Keuangan dan Persediaan</p>
                     </div>
                  </div>
                  <div className="report-print-header__meta">
                     <div>
                        <span className="report-print-header__label">Periode</span>
                        <strong>{FILTER_OPTIONS[filter] || filter}</strong>
                     </div>
                     <div>
                        <span className="report-print-header__label">Tanggal Cetak</span>
                        <strong>{new Date().toLocaleString("id-ID")}</strong>
                     </div>
                  </div>
               </div>

               <div className="report-section">
                  <div className="report-section__header">
                     <div>
                        <h2 className="report-section__title">1. Laporan Penjualan</h2>
                        <p className="report-section__subtitle">Ringkasan transaksi kasir dan order terkonfirmasi selama periode terpilih.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Omzet</div>
                        <div className="metric-card__value">{formatCurrency(reportData.omzet)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Item Terjual</div>
                        <div className="metric-card__value">{reportData.itemTerjual}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Jumlah Transaksi</div>
                        <div className="metric-card__value">{reportData.totalTransactions}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Laba Kotor</div>
                        <div className="metric-card__value">{formatCurrency(reportData.labaKotor)}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap laporan-page__table-wrap--scroll">
                     <table className="laporan-table">
                        <thead>
                           <tr>
                              <th className="laporan-table__head">Tanggal</th>
                              <th className="laporan-table__head">Jenis</th>
                              <th className="laporan-table__head">ID Pelanggan</th>
                              <th className="laporan-table__head">Metode</th>
                              <th className="laporan-table__head">Status</th>
                              <th className="laporan-table__head">Total</th>
                           </tr>
                        </thead>
                        <tbody>
                           {reportData.salesRows.length === 0 ? (
                              <tr>
                                 <td className="laporan-table__empty" colSpan="6">
                                    Tidak ada penjualan valid pada periode ini.
                                 </td>
                              </tr>
                           ) : (
                              reportData.salesRows.map((item) => (
                                 <tr key={`${item.type}-${item.id}`} className="laporan-table__row">
                                    <td className="laporan-table__cell">{formatDate(item.tanggal)}</td>
                                    <td className="laporan-table__cell">
                                       <span className={toToneClass(item.type)}>{item.type}</span>
                                    </td>
                                    <td className="laporan-table__cell">{item.pelanggan}</td>
                                    <td className="laporan-table__cell">
                                       <span className={toToneClass(item.metode)}>{item.metode}</span>
                                    </td>
                                    <td className="laporan-table__cell">
                                       <span className={toToneClass(item.status)}>{item.status}</span>
                                    </td>
                                    <td className="laporan-table__cell">{formatCurrency(item.total)}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="report-section">
                  <div className="report-section__header">
                     <div>
                        <h2 className="report-section__title">2. Laporan Produk Terjual</h2>
                        <p className="report-section__subtitle">Ringkasan barang yang terjual berdasarkan detail transaksi dan order.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Jumlah Item Terjual</div>
                        <div className="metric-card__value">{reportData.productSalesRows.reduce((sum, item) => sum + item.qty, 0)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Jumlah Produk Terjual</div>
                        <div className="metric-card__value">{reportData.productSalesRows.length}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Omzet Produk</div>
                        <div className="metric-card__value">{formatCurrency(reportData.productSalesRows.reduce((sum, item) => sum + item.revenue, 0))}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap laporan-page__table-wrap--scroll">
                     <table className="laporan-table">
                        <thead>
                           <tr>
                              <th className="laporan-table__head">Produk</th>
                              <th className="laporan-table__head">Qty Terjual</th>
                              <th className="laporan-table__head">Pendapatan</th>
                              <th className="laporan-table__head">Modal</th>
                              <th className="laporan-table__head">Laba</th>
                           </tr>
                        </thead>
                        <tbody>
                           {reportData.productSalesRows.length === 0 ? (
                              <tr>
                                 <td className="laporan-table__empty" colSpan="5">
                                    Belum ada produk terjual pada periode ini.
                                 </td>
                              </tr>
                           ) : (
                              reportData.productSalesRows.map((item) => (
                                 <tr key={item.id} className="laporan-table__row">
                                    <td className="laporan-table__cell">{item.name}</td>
                                    <td className="laporan-table__cell">{item.qty}</td>
                                    <td className="laporan-table__cell">{formatCurrency(item.revenue)}</td>
                                    <td className="laporan-table__cell">{formatCurrency(item.modal)}</td>
                                    <td className="laporan-table__cell">{formatCurrency(item.laba)}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="report-section">
                  <div className="report-section__header">
                     <div>
                        <h2 className="report-section__title">3. Laporan Stok</h2>
                        <p className="report-section__subtitle">Posisi stok barang saat ini dan status ketersediaan.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Total Stok Unit</div>
                        <div className="metric-card__value">{reportData.totalStok}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Nilai Stok</div>
                        <div className="metric-card__value">{formatCurrency(reportData.stockValue)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Produk Kosong</div>
                        <div className="metric-card__value">{reportData.outOfStockProducts.length}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Produk Menipis</div>
                        <div className="metric-card__value">{reportData.lowStockProducts.length}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap laporan-page__table-wrap--scroll">
                     <table className="laporan-table">
                        <thead>
                           <tr>
                              <th className="laporan-table__head">Produk</th>
                              <th className="laporan-table__head">Stok</th>
                              <th className="laporan-table__head">Harga Beli</th>
                              <th className="laporan-table__head">Harga Jual</th>
                              <th className="laporan-table__head">Status</th>
                           </tr>
                        </thead>
                        <tbody>
                           {products.length === 0 ? (
                              <tr>
                                 <td className="laporan-table__empty" colSpan="5">
                                    Belum ada data produk.
                                 </td>
                              </tr>
                           ) : (
                              products.map((item) => {
                                 const stok = Number(item.stok || 0);
                                 let status = "Cukup";
                                 if (stok === 0) status = "Habis";
                                 else if (stok <= 5) status = "Menipis";

                                 return (
                                    <tr key={item.id} className="laporan-table__row">
                                       <td className="laporan-table__cell">{item.nama_produk}</td>
                                       <td className="laporan-table__cell">{stok}</td>
                                       <td className="laporan-table__cell">{formatCurrency(item.harga_beli || 0)}</td>
                                       <td className="laporan-table__cell">{formatCurrency(item.harga_jual || 0)}</td>
                                       <td className="laporan-table__cell">
                                          <span className={toToneClass(status)}>{status}</span>
                                       </td>
                                    </tr>
                                 );
                              })
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>


               <div className="report-section">
                  <div className="report-section__header">
                     <div>
                        <h2 className="report-section__title">4. Laporan Laba</h2>
                        <p className="report-section__subtitle">Ringkasan omzet, biaya modal, dan laba kotor dari penjualan.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Omzet</div>
                        <div className="metric-card__value">{formatCurrency(reportData.omzet)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Modal</div>
                        <div className="metric-card__value">{formatCurrency(reportData.totalModal)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Laba Kotor</div>
                        <div className="metric-card__value">{formatCurrency(reportData.labaKotor)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Margin</div>
                        <div className="metric-card__value">
                           {reportData.omzet > 0 ? `${((reportData.labaKotor / reportData.omzet) * 100).toFixed(1)}%` : "0%"}
                        </div>
                     </div>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}
