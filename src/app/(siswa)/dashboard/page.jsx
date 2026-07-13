"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
import Loading from "@/components/Loading";

const supabase = createClient();

export default function DashboardSiswaPage() {
   const [activeNis, setActiveNis] = useState(null);
   const [student, setStudent] = useState(null);
   const [transactions, setTransactions] = useState([]);
   const [loading, setLoading] = useState(true);

   async function fetchData() {
      setLoading(true);
      try {
         const session = getRoleSession("siswa");
         const nisSession = session?.nis ?? null;
         if (!nisSession) {
            setStudent(null);
            setActiveNis(null);
            return;
         }

         const { data: siswaData, error: siswaError } = await supabase
            .from("siswa")
            .select("nis,nama_siswa,kelas,total_hutang,saldo")
            .eq("nis", nisSession)
            .maybeSingle();

         if (siswaError) throw siswaError;
         const activeStudent = siswaData ?? null;
         if (!activeStudent) {
            setStudent(null);
            setActiveNis(null);
            return;
         }

         setActiveNis(activeStudent.nis);
         setStudent(activeStudent);

         const { data: transactionData, error: transactionError } = await supabase
            .from("transaksi")
            .select("id,metode_pembayaran,status_pembayaran,total_bayar,created_at")
            .eq("nis_siswa", activeStudent.nis)
            .order("created_at", { ascending: false });

         if (transactionError) throw transactionError;

         setTransactions(transactionData ?? []);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   }

   useEffect(() => {
      async function loadDashboard() {
         await fetchData();
      }

      void loadDashboard();
   }, []);

   const debtText = useMemo(() => {
      if (!student) return "";
      return student.total_hutang > 0
         ? `Rp ${Number(student.total_hutang).toLocaleString()}`
         : "Rp 0";
   }, [student]);

   const saldoText = useMemo(() => {
      if (!student) return "";
      return `Rp ${Number(student.saldo ?? 0).toLocaleString()}`;
   }, [student]);

   return (
      <div className="student-dashboard">
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
                     <div className={student.total_hutang > 0 ? "dashboard-card__value dashboard-card__value--warning" : "dashboard-card__value dashboard-card__value--ok"}>{debtText}</div>
                     <div className="dashboard-card__meta">{student.total_hutang > 0 ? "Ada tunggakan yang perlu dibayar" : "Tidak ada hutang saat ini"}</div>
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
                        <th className="transaction-table__head">Metode</th>
                        <th className="transaction-table__head">Status</th>
                        <th className="transaction-table__head">Total Bayar</th>
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
                              <td className="transaction-table__cell">{trx.metode_pembayaran}</td>
                              <td className="transaction-table__cell">{trx.status_pembayaran || "-"}</td>
                              <td className="transaction-table__cell">Rp {Number(trx.total_bayar || 0).toLocaleString()}</td>
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
