"use client";

import { useEffect, useMemo } from "react";
import { useTeacher } from "@/hooks/useTeacher";
import Loading from "@/components/Loading";

export default function DashboardGuruPage() {
   const { teacher, orders, transactions, loading, refresh } = useTeacher({ initialFetch: false });

   useEffect(() => {
      void refresh();
   }, [refresh]);

   const debtText = useMemo(() => {
      if (!teacher) return "";
      return teacher.total_hutang > 0 ? `Rp ${Number(teacher.total_hutang).toLocaleString()}` : "Rp 0";
   }, [teacher]);

   const saldoText = useMemo(() => {
      if (!teacher) return "";
      return `Rp ${Number(teacher.saldo ?? 0).toLocaleString()}`;
   }, [teacher]);

   const transactionTypeLabel = (trx) => {
      if (trx.transaction_type === "hutang_payment") return "Pelunasan Hutang";
      if (trx.transaction_type === "order") return "Pembelian Produk";
      return "Transaksi";
   };

   return (
      <div className="dashboard-page">
         <div className="dashboard-overview">
            <div className="dashboard-card dashboard-card--profile">
               <div className="dashboard-card__heading">Profil Guru</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !teacher ? (
                  <div className="dashboard-card__empty">Guru tidak ditemukan.</div>
               ) : (
                  <div className="dashboard-card__content">
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Nama</span>
                        <span>{teacher.nama_guru}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">NIP</span>
                        <span>{teacher.nip}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Bidang Studi</span>
                        <span>{teacher.bidang_studi}</span>
                     </div>
                  </div>
               )}
            </div>

            <div className="dashboard-card dashboard-card--saldo">
               <div className="dashboard-card__heading">Saldo</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !teacher ? (
                  <div className="dashboard-card__empty">-</div>
               ) : (
                  <div className="dashboard-card__value dashboard-card__value--saldo">{saldoText}</div>
               )}
            </div>

            <div className="dashboard-card dashboard-card--debt">
               <div className="dashboard-card__heading">Hutang</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !teacher ? (
                  <div className="dashboard-card__empty">-</div>
               ) : (
                  <div className={`dashboard-card__value ${teacher.total_hutang > 0 ? "dashboard-card__value--warning" : "dashboard-card__value--ok"}`}>
                     {debtText}
                  </div>
               )}
            </div>
         </div>

         <div className="dashboard-card dashboard-card--transactions">
            <div className="section-header">
               <h2 className="section-header__title">Pesanan Terbaru</h2>
            </div>
            {loading ? (
               <Loading message="Memuat..." size="small" />
            ) : transactions.length === 0 ? (
               <div className="dashboard-card__empty">Tidak ada riwayat transaksi.</div>
            ) : (
               <div className="transaction-table-wrap">
                  <table className="transaction-table">
                     <thead>
                        <tr>
                           <th className="transaction-table__head">Tanggal</th>
                           <th className="transaction-table__head">Jenis</th>
                           <th className="transaction-table__head">Metode</th>
                           <th className="transaction-table__head">Status</th>
                           <th className="transaction-table__head">Nominal</th>
                        </tr>
                     </thead>
                     <tbody>
                        {transactions.slice(0, 5).map((trx) => (
                           <tr key={trx.id} className="transaction-table__row">
                              <td className="transaction-table__cell">{new Date(trx.created_at).toLocaleDateString("id-ID")}</td>
                              <td className="transaction-table__cell">{transactionTypeLabel(trx)}</td>
                              <td className="transaction-table__cell">{trx.payment_method || "-"}</td>
                              <td className="transaction-table__cell">
                                 {trx.transaction_type === "order"
                                    ? trx.order_status || trx.payment_status || "-"
                                    : trx.payment_status || "-"}
                              </td>
                              <td className="transaction-table__cell">Rp {Number(trx.amount_total || 0).toLocaleString("id-ID")}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
   );
}
