"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import { toast } from "react-hot-toast";
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

const isValidTransaction = (item) => item.status_pembayaran === "Lunas";
const isValidOrder = (item) => item.status_order === "Dikonfirmasi" && item.status_pembayaran === "Lunas";

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
            const now = new Date();
            let startDate = new Date(now);

            if (filter === "month") {
               startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else {
               startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }

            const start = startDate.toISOString();
            const end = now.toISOString();

            const [productRes, transactionRes, orderRes, orderGuruRes] = await Promise.all([
               supabase.from("produk").select("id,nama_produk,stok,harga_beli,harga_jual").order("nama_produk", { ascending: true }),
               supabase
                  .from("transaksi")
                  .select("id, nis_siswa, nip_guru, metode_pembayaran, status_pembayaran, total_bayar, created_at")
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
                  ? supabase.from("detail_transaksi").select("transaksi_id, produk_id, jumlah").in("transaksi_id", transactionIds)
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
      const productMap = new Map((products ?? []).map((item) => [item.id, item]));
      const salesRows = [
         ...validTransactions.map((item) => ({
            id: item.id,
            type: "Transaksi Kasir",
            tanggal: item.created_at,
            pelanggan: item.nis_siswa || item.nip_guru || "-",
            metode: item.metode_pembayaran,
            status: item.status_pembayaran,
            total: Number(item.total_bayar || 0),
         })),
         ...validOrders.map((item) => ({
            id: item.id,
            type: "Order Siswa",
            tanggal: item.created_at,
            pelanggan: item.nis_siswa || "-",
            metode: item.metode_pembayaran,
            status: item.status_order,
            total: Number(item.total_harga || 0),
         })),
         ...validOrdersGuru.map((item) => ({
            id: item.id,
            type: "Order Guru",
            tanggal: item.created_at,
            pelanggan: item.nip_guru || "-",
            metode: item.metode_pembayaran,
            status: item.status_order,
            total: Number(item.total_harga || 0),
         })),
      ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

      const productSalesMap = new Map();
      const addProductLine = (detail, sellPrice) => {
         const product = productMap.get(detail.produk_id);
         if (!product) return;

         const qty = Number(detail.jumlah || 0);
         if (!qty) return;

         const key = product.id;
         const current = productSalesMap.get(key) ?? {
            id: product.id,
            name: product.nama_produk,
            qty: 0,
            revenue: 0,
            modal: 0,
            laba: 0,
         };

         current.qty += qty;
         current.revenue += qty * Number(sellPrice || 0);
         current.modal += qty * Number(product.harga_beli || 0);
         current.laba += qty * (Number(sellPrice || 0) - Number(product.harga_beli || 0));
         productSalesMap.set(key, current);
      };

      validTransactions.forEach((transaction) => {
         const items = (detailTransactions ?? []).filter((detail) => detail.transaksi_id === transaction.id);
         items.forEach((detail) => {
            const product = productMap.get(detail.produk_id);
            addProductLine(detail, Number(product?.harga_jual || 0));
         });
      });

      validOrders.forEach((order) => {
         const items = (detailOrders ?? []).filter((detail) => detail.order_id === order.id);
         items.forEach((detail) => {
            const product = productMap.get(detail.produk_id);
            addProductLine(detail, Number(detail.harga_satuan || product?.harga_jual || 0));
         });
      });

      validOrdersGuru.forEach((order) => {
         const items = (detailOrdersGuru ?? []).filter((detail) => detail.order_id === order.id);
         items.forEach((detail) => {
            const product = productMap.get(detail.produk_id);
            addProductLine(detail, Number(detail.harga_satuan || product?.harga_jual || 0));
         });
      });

      const productSalesRows = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);

      const totalRevenue = salesRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const totalModal = productSalesRows.reduce((sum, item) => sum + Number(item.modal || 0), 0);
      const totalLaba = productSalesRows.reduce((sum, item) => sum + Number(item.laba || 0), 0);
      const totalStok = (products ?? []).reduce((sum, item) => sum + Number(item.stok || 0), 0);
      const stockValue = (products ?? []).reduce((sum, item) => sum + Number(item.stok || 0) * Number(item.harga_beli || 0), 0);
      const outOfStockProducts = (products ?? []).filter((item) => Number(item.stok || 0) <= 0);
      const lowStockProducts = (products ?? []).filter((item) => Number(item.stok || 0) > 0 && Number(item.stok || 0) <= 5);

      return {
         salesRows,
         productSalesRows,
         totalRevenue,
         totalModal,
         totalLaba,
         totalStok,
         stockValue,
         outOfStockProducts,
         lowStockProducts,
      };
   }, [products, validTransactions, validOrders, validOrdersGuru, detailTransactions, detailOrders, detailOrdersGuru]);

   function exportReportToCsv() {
      const now = new Date();
      const periodLabel = filter === "month" ? "bulan_ini" : "hari_ini";
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
      rows.push(["Total Penjualan", formatCurrency(reportData.totalRevenue)]);
      rows.push(["Total Modal", formatCurrency(reportData.totalModal)]);
      rows.push(["Total Laba", formatCurrency(reportData.totalLaba)]);
      rows.push(["Total Stok Unit", reportData.totalStok]);
      rows.push(["Nilai Stok", formatCurrency(reportData.stockValue)]);
      rows.push([]);
      rows.push(["LAPORAN PENJUALAN"]);
      rows.push(["Tanggal", "Jenis", "Pelanggan", "Metode", "Status", "Total"]);
      reportData.salesRows.forEach((item) => {
         rows.push([formatDate(item.tanggal), item.type, item.pelanggan, item.metode, item.status, formatCurrency(item.total)]);
      });
      rows.push([]);
      rows.push(["LAPORAN PRODUK TERJUAL"]);
      rows.push(["Produk", "Jumlah Terjual", "Pendapatan", "Modal", "Laba"]);
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
      rows.push(["LAPORAN PEMBELIAN (MODAL)"]);
      rows.push(["Produk", "Jumlah Terjual", "Harga Beli", "Total Modal"]);
      reportData.productSalesRows.forEach((item) => {
         rows.push([item.name, item.qty, formatCurrency(item.modal / Math.max(item.qty, 1)), formatCurrency(item.modal)]);
      });
      rows.push([]);
      rows.push(["LAPORAN LABA"]);
      rows.push(["Jenis", "Nilai"]);
      rows.push(["Pendapatan", formatCurrency(reportData.totalRevenue)]);
      rows.push(["Modal", formatCurrency(reportData.totalModal)]);
      rows.push(["Laba Kotor", formatCurrency(reportData.totalLaba)]);
      rows.push(["Margin", `${reportData.totalRevenue > 0 ? ((reportData.totalLaba / reportData.totalRevenue) * 100).toFixed(1) : 0}%`]);

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
         ["Total Penjualan", formatCurrency(reportData.totalRevenue)],
         ["Total Modal", formatCurrency(reportData.totalModal)],
         ["Total Laba", formatCurrency(reportData.totalLaba)],
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

      const purchaseRows = reportData.productSalesRows.map((item) => [
         item.name,
         item.qty,
         formatCurrency(item.modal / Math.max(item.qty, 1)),
         formatCurrency(item.modal),
      ]);

      const profitRows = [
         ["Pendapatan", formatCurrency(reportData.totalRevenue)],
         ["Modal", formatCurrency(reportData.totalModal)],
         ["Laba Kotor", formatCurrency(reportData.totalLaba)],
         ["Margin", `${reportData.totalRevenue > 0 ? ((reportData.totalLaba / reportData.totalRevenue) * 100).toFixed(1) : 0}%`],
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
              <h2 class="section-title">4. Laporan Pembelian</h2>
              <table>
                <thead><tr><th>Produk</th><th>Qty</th><th>Harga Beli</th><th>Total Modal</th></tr></thead>
                <tbody>${buildRowsHtml(purchaseRows)}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">5. Laporan Laba</h2>
              <table>
                <thead><tr><th>Jenis</th><th>Nilai</th></tr></thead>
                <tbody>${buildRowsHtml(profitRows)}</tbody>
              </table>
            </div>

            <div class="foot">
              <div>
                <div>Disetujui oleh</div>
                <div class="signature-line"></div>
                <div>Pengelola Koperasi</div>
              </div>
              <div>
                <div>Diperiksa oleh</div>
                <div class="signature-line"></div>
                <div>Bendahara</div>
              </div>
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
                  <option value="month">{FILTER_OPTIONS.month}</option>
               </select>
               <button className="btn btn--secondary laporan-page__button" onClick={exportReportToCsv}>
                  Export CSV
               </button>
               <button className="btn btn--secondary laporan-page__button" onClick={handleExportPdf}>
                  Export PDF
               </button>
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
                        <p className="report-section__subtitle">Transaksi kasir dan order yang sudah dikonfirmasi dan lunas.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Total Penjualan</div>
                        <div className="metric-card__value">{formatCurrency(reportData.totalRevenue)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Jumlah Transaksi Valid</div>
                        <div className="metric-card__value">{reportData.salesRows.length}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Order Siswa Valid</div>
                        <div className="metric-card__value">{validOrders.length}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Order Guru Valid</div>
                        <div className="metric-card__value">{validOrdersGuru.length}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap">
                     <table className="laporan-table">
                        <thead>
                           <tr>
                              <th className="laporan-table__head">Tanggal</th>
                              <th className="laporan-table__head">Jenis</th>
                              <th className="laporan-table__head">Pelanggan</th>
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
                                    <td className="laporan-table__cell">{item.type}</td>
                                    <td className="laporan-table__cell">{item.pelanggan}</td>
                                    <td className="laporan-table__cell">{item.metode}</td>
                                    <td className="laporan-table__cell">{item.status}</td>
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
                        <div className="metric-card__label">Produk Terlibat</div>
                        <div className="metric-card__value">{reportData.productSalesRows.length}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Pendapatan</div>
                        <div className="metric-card__value">{formatCurrency(reportData.productSalesRows.reduce((sum, item) => sum + item.revenue, 0))}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap">
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
                        <div className="metric-card__label">Barang Habis</div>
                        <div className="metric-card__value">{reportData.outOfStockProducts.length}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Barang Menipis</div>
                        <div className="metric-card__value">{reportData.lowStockProducts.length}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap">
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
                                       <td className="laporan-table__cell">{status}</td>
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
                        <h2 className="report-section__title">4. Laporan Pembelian</h2>
                        <p className="report-section__subtitle">Modal pembelian yang dihitung dari harga beli produk dan jumlah yang terjual.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Total Modal</div>
                        <div className="metric-card__value">{formatCurrency(reportData.totalModal)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Produk dengan Modal</div>
                        <div className="metric-card__value">{reportData.productSalesRows.length}</div>
                     </div>
                  </div>

                  <div className="laporan-page__table-wrap">
                     <table className="laporan-table">
                        <thead>
                           <tr>
                              <th className="laporan-table__head">Produk</th>
                              <th className="laporan-table__head">Qty Terjual</th>
                              <th className="laporan-table__head">Harga Beli</th>
                              <th className="laporan-table__head">Total Modal</th>
                           </tr>
                        </thead>
                        <tbody>
                           {reportData.productSalesRows.length === 0 ? (
                              <tr>
                                 <td className="laporan-table__empty" colSpan="4">
                                    Belum ada data pembelian modal.
                                 </td>
                              </tr>
                           ) : (
                              reportData.productSalesRows.map((item) => (
                                 <tr key={item.id} className="laporan-table__row">
                                    <td className="laporan-table__cell">{item.name}</td>
                                    <td className="laporan-table__cell">{item.qty}</td>
                                    <td className="laporan-table__cell">{formatCurrency(item.modal / Math.max(item.qty, 1))}</td>
                                    <td className="laporan-table__cell">{formatCurrency(item.modal)}</td>
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
                        <h2 className="report-section__title">5. Laporan Laba</h2>
                        <p className="report-section__subtitle">Selisih pendapatan penjualan dan modal pembelian.</p>
                     </div>
                  </div>

                  <div className="metric-grid">
                     <div className="metric-card">
                        <div className="metric-card__label">Pendapatan</div>
                        <div className="metric-card__value">{formatCurrency(reportData.totalRevenue)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Modal</div>
                        <div className="metric-card__value">{formatCurrency(reportData.totalModal)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Laba Kotor</div>
                        <div className="metric-card__value">{formatCurrency(reportData.totalLaba)}</div>
                     </div>
                     <div className="metric-card">
                        <div className="metric-card__label">Margin</div>
                        <div className="metric-card__value">
                           {reportData.totalRevenue > 0 ? `${((reportData.totalLaba / reportData.totalRevenue) * 100).toFixed(1)}%` : "0%"}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="report-signature">
                  <div>
                     <p className="report-signature__label">Disetujui oleh</p>
                     <div className="report-signature__line" />
                     <p className="report-signature__name">Pengelola Koperasi</p>
                  </div>
                  <div>
                     <p className="report-signature__label">Diperiksa oleh</p>
                     <div className="report-signature__line" />
                     <p className="report-signature__name">Bendahara</p>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}
