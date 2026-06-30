"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";

const supabase = createClient();

export default function DashboardSiswaPage() {
   const [activeNis, setActiveNis] = useState(null);
   const [student, setStudent] = useState(null);
   const [produk, setProduk] = useState([]);
   const [transactions, setTransactions] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetchData();
   }, []);

   async function fetchData() {
      setLoading(true);
      try {
         const { data: siswaData, error: siswaError } = await supabase
            .from("siswa")
            .select("nis,nama_siswa,kelas,total_hutang")
            .limit(1);

         if (siswaError) throw siswaError;
         const activeStudent = siswaData?.[0] ?? null;
         if (!activeStudent) {
            setStudent(null);
            setActiveNis(null);
            return;
         }

         setActiveNis(activeStudent.nis);
         setStudent(activeStudent);

         const [{ data: productData, error: productError }, { data: transactionData, error: transactionError }] = await Promise.all([
            supabase.from("produk").select("id,nama_produk,harga,stok"),
            supabase
               .from("transaksi")
               .select("id,metode_pembayaran,status_pembayaran,total_bayar,created_at")
               .eq("nis_siswa", activeStudent.nis)
               .order("created_at", { ascending: false }),
         ]);

         if (productError) throw productError;
         if (transactionError) throw transactionError;

         setProduk(productData ?? []);
         setTransactions(transactionData ?? []);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   }

   const debtText = useMemo(() => {
      if (!student) return "";
      return student.total_hutang > 0
         ? `Hutang Anda: Rp ${Number(student.total_hutang).toLocaleString()}`
         : "Tidak ada hutang saat ini.";
   }, [student]);

   return (
      <div className="student-dashboard">
         <div className="student-dashboard__top">
            <div className="dashboard-card">
               <div className="dashboard-card__heading">Profil Siswa</div>
               {loading ? (
                  <div className="dashboard-card__loading">Memuat...</div>
               ) : !student ? (
                  <div className="dashboard-card__empty">Siswa tidak ditemukan.</div>
               ) : (
                  <div className="dashboard-card__content">
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Nama</span>
                        <span>{student.nama_siswa}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Kelas</span>
                        <span>{student.kelas}</span>
                     </div>
                     <div className={student.total_hutang > 0 ? "dashboard-card__debt dashboard-card__debt--warning" : "dashboard-card__debt dashboard-card__debt--ok"}>
                        {debtText}
                     </div>
                  </div>
               )}
            </div>
         </div>

         <div className="product-section">
            <div className="section-header">
               <h2 className="section-header__title">Katalog Produk</h2>
               <p className="section-header__subtitle">Lihat harga barang dan ketersediaan stok koperasi saat ini.</p>
            </div>
            <div className="product-grid">
               {produk.length === 0 ? (
                  <div className="product-grid__empty">Tidak ada produk tersedia.</div>
               ) : (
                  produk.map((item) => (
                     <div key={item.id} className="product-card product-card--small">
                        <div className="product-card__name">{item.nama_produk}</div>
                        <div className="product-card__price">Rp {Number(item.harga).toLocaleString()}</div>
                        <div className="product-card__stok">Stok tersisa: {item.stok}</div>
                     </div>
                  ))
               )}
            </div>
         </div>

         <div className="transaction-section">
            <div className="section-header">
               <h2 className="section-header__title">Riwayat Belanja Saya</h2>
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
