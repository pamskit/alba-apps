"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";

const supabase = createClient();

const FILTER_OPTIONS = {
   today: "Hari Ini",
   month: "Bulan Ini",
};

export default function LaporanPage() {
   const [filter, setFilter] = useState("today");
   const [transactions, setTransactions] = useState([]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const loadTransactions = async () => {
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

            const { data, error } = await supabase
               .from("transaksi")
               .select("id, nis_siswa, metode_pembayaran, status_pembayaran, total_bayar, created_at")
               .gte("created_at", start)
               .lte("created_at", end)
               .order("created_at", { ascending: false });

            if (!error) {
               setTransactions(data ?? []);
            }
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };

      void loadTransactions();
   }, [filter]);

   const metrics = useMemo(() => {
      const totalTunai = transactions.reduce((sum, item) => {
         return item.metode_pembayaran === "Tunai" && item.status_pembayaran === "Lunas"
            ? sum + Number(item.total_bayar || 0)
            : sum;
      }, 0);

      const totalQris = transactions.reduce((sum, item) => {
         return item.metode_pembayaran === "QRIS" && item.status_pembayaran === "Lunas"
            ? sum + Number(item.total_bayar || 0)
            : sum;
      }, 0);

      const totalHutangBaru = transactions.reduce((sum, item) => {
         return item.metode_pembayaran === "Hutang" ? sum + Number(item.total_bayar || 0) : sum;
      }, 0);

      const totalPelunasanHutang = transactions.reduce((sum, item) => {
         return item.metode_pembayaran === "Pelunasan" ? sum + Number(item.total_bayar || 0) : sum;
      }, 0);

      return {
         totalTunai,
         totalQris,
         totalHutangBaru,
         totalPelunasanHutang,
      };
   }, [transactions]);

   return (
      <div className="laporan-page">
         <div className="laporan-page__header">
            <div>
               <h1 className="laporan-page__title">Laporan Finansial Koperasi</h1>
               <p className="laporan-page__subtitle">Ringkasan pemasukan dan transaksi dalam periode tertentu.</p>
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
               <button
                  className="btn btn--secondary"
                  style={{ marginLeft: 12 }}
                  onClick={() => {
                     // export transactions as CSV for Excel
                     const rows = [
                        ["Tanggal", "NIS Siswa", "Metode", "Status", "Total Bayar"],
                        ...transactions.map((t) => [
                           new Date(t.created_at).toLocaleString("id-ID"),
                           t.nis_siswa ?? "",
                           t.metode_pembayaran ?? "",
                           t.status_pembayaran ?? "",
                           Number(t.total_bayar || 0),
                        ]),
                     ];

                     const csvContent = rows
                        .map((r) =>
                           r
                              .map((cell) => {
                                 if (typeof cell === "string") {
                                    // escape quotes
                                    return `"${cell.replace(/"/g, '""')}"`;
                                 }
                                 return `"${String(cell)}"`;
                              })
                              .join(",")
                        )
                        .join("\n");

                     // add BOM for Excel compatibility
                     const bom = "\uFEFF";
                     const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement("a");
                     a.href = url;
                     const now = new Date();
                     const fname = `laporan_${now.toISOString().slice(0, 10)}.csv`;
                     a.download = fname;
                     document.body.appendChild(a);
                     a.click();
                     a.remove();
                     URL.revokeObjectURL(url);
                  }}
               >
                  Export Excel (CSV)
               </button>
            </div>
         </div>

         {loading ? (
            <div className="laporan-page__loading">Memuat data...</div>
         ) : (
            <>
               <div className="metric-grid">
                  <div className="metric-card">
                     <div className="metric-card__label">Total Pemasukan Tunai</div>
                     <div className="metric-card__value">Rp {metrics.totalTunai.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                     <div className="metric-card__label">Total Pemasukan QRIS</div>
                     <div className="metric-card__value">Rp {metrics.totalQris.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                     <div className="metric-card__label">Total Hutang Baru</div>
                     <div className="metric-card__value">Rp {metrics.totalHutangBaru.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                     <div className="metric-card__label">Total Pelunasan Hutang</div>
                     <div className="metric-card__value">Rp {metrics.totalPelunasanHutang.toLocaleString()}</div>
                  </div>
               </div>

               <div className="laporan-page__table-wrap">
                  <table className="laporan-table">
                     <thead>
                        <tr>
                           <th className="laporan-table__head">Tanggal</th>
                           <th className="laporan-table__head">NIS Siswa</th>
                           <th className="laporan-table__head">Metode</th>
                           <th className="laporan-table__head">Status</th>
                           <th className="laporan-table__head">Total Bayar</th>
                        </tr>
                     </thead>
                     <tbody>
                        {transactions.length === 0 ? (
                           <tr>
                              <td className="laporan-table__empty" colSpan="5">
                                 Tidak ada transaksi pada periode ini.
                              </td>
                           </tr>
                        ) : (
                           transactions.map((item) => (
                              <tr key={item.id} className="laporan-table__row">
                                 <td className="laporan-table__cell">{new Date(item.created_at).toLocaleString("id-ID")}</td>
                                 <td className="laporan-table__cell">{item.nis_siswa || "-"}</td>
                                 <td className="laporan-table__cell">{item.metode_pembayaran}</td>
                                 <td className="laporan-table__cell">{item.status_pembayaran || "-"}</td>
                                 <td className="laporan-table__cell">Rp {Number(item.total_bayar || 0).toLocaleString()}</td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </>
         )}
      </div>
   );
}
