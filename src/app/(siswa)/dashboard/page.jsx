"use client";

import { useMemo } from "react";
import { useStudent } from "@/hooks/useStudent";
import Loading from "@/components/Loading";

export default function DashboardSiswaPage() {
   const { student, transactions, activeNis, loading } = useStudent();

   const transactionTypeLabel = (trx) => {
      if (trx.transaction_type === "hutang_payment") return "Pelunasan Hutang";
      if (trx.transaction_type === "order") return "Pembelian Produk";
      return "Transaksi";
   };

   const debtText = useMemo(() => {
      if (!student) return "";
      return student.total_hutang > 0 ? `Rp ${Number(student.total_hutang).toLocaleString("id-ID")}` : "Rp 0";
   }, [student]);

   const saldoText = useMemo(() => {
      if (!student) return "";
      return `Rp ${Number(student.saldo ?? 0).toLocaleString("id-ID")}`;
   }, [student]);

   return (
      <div className="dashboard-page">
         <div className="dashboard-overview">
            <div className="dashboard-card dashboard-card--profile">
               <div className="dashboard-card__heading">Profil Siswa</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !student ? (
                  <div className="dashboard-card__empty">Siswa tidak ditemukan.</div>
               ) : (
                  <div className="dashboard-card__content">
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Nama</span>
                        <span>{student.nama_siswa}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">NIS</span>
                        <span>{student.nis}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Kelas</span>
                        <span>{student.kelas}</span>
                     </div>
                  </div>
               )}
            </div>

            <div className="dashboard-card dashboard-card--debt">
               <div className="dashboard-card__heading">Total Hutang</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !student ? (
                  <div className="dashboard-card__empty">Belum ada data.</div>
               ) : (
                  <div className="dashboard-card__value-wrap">
                     <div className={student.total_hutang > 0 ? "dashboard-card__value dashboard-card__value--warning" : "dashboard-card__value dashboard-card__value--ok"}>
                        {debtText}
                     </div>
                     <div className="dashboard-card__meta">
                        {student.total_hutang > 0 ? "Ada tunggakan yang perlu dibayar" : "Tidak ada hutang saat ini"}
                     </div>
                  </div>
               )}
            </div>

            <div className="dashboard-card dashboard-card--saldo">
               <div className="dashboard-card__heading">Total Saldo</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !student ? (
                  <div className="dashboard-card__empty">Belum ada data.</div>
               ) : (
                  <div className="dashboard-card__value-wrap">
                     <div className="dashboard-card__value dashboard-card__value--saldo">{saldoText}</div>
                     <div className="dashboard-card__meta">Saldo tersedia untuk transaksi</div>
                  </div>
               )}
            </div>
         </div>

         <div className="dashboard-card dashboard-card--transactions">
            <div className="section-header">
               <h2 className="section-header__title">Riwayat Transaksi</h2>
               <p className="section-header__subtitle">Daftar transaksi terbaru untuk NIS: {activeNis ?? "-"}</p>
            </div>
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
                     {transactions.length === 0 ? (
                        <tr>
                           <td className="transaction-table__empty" colSpan="4">
                              Tidak ada riwayat transaksi.
                           </td>
                        </tr>
                     ) : (
                        transactions.map((trx) => (
                           <tr key={trx.id} className="transaction-table__row">
                              <td className="transaction-table__cell">{new Date(trx.created_at).toLocaleString("id-ID")}</td>
                              <td className="transaction-table__cell">{transactionTypeLabel(trx)}</td>
                              <td className="transaction-table__cell">{trx.payment_method || "-"}</td>
                              <td className="transaction-table__cell">
                                 {trx.transaction_type === "order"
                                    ? trx.order_status || trx.payment_status || "-"
                                    : trx.payment_status || "-"}
                              </td>
                              <td className="transaction-table__cell">Rp {Number(trx.amount_total || 0).toLocaleString("id-ID")}</td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
}
