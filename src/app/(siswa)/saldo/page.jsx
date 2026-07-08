"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./saldo.css";

const supabase = createClient();

export default function SiswaSaldoPage() {
   const [student, setStudent] = useState(null);
   const [historyItems, setHistoryItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [errorMessage, setErrorMessage] = useState("");

   function formatHistoryDescription(item) {
      if (item.type === "Saldo Masuk") {
         if (item.tipe === "Refund") {
            return "Refund - Saldo dikembalikan karena order ditolak";
         }
         const baseText = item.method ? `Top-up saldo via ${item.method}` : "Saldo masuk";
         return item.description && item.description.trim()
            ? `${baseText} • ${item.description}`
            : baseText;
      }

      if (item.type === "Saldo Keluar") {
         if (item.tipe === "Order_Saldo") return "Pembelian produk menggunakan saldo";
         if (item.tipe === "Hutang_Payment") return "Pelunasan hutang dari saldo";
         if (item.method === "Pembayaran Saldo") return "Pembayaran belanja menggunakan saldo";
         if (item.method === "Pembayaran Hutang") return "Pelunasan hutang dari saldo";
         return item.description || item.method || "Pengeluaran saldo";
      }

      return item.description || item.method || "-";
   }

   useEffect(() => {
      async function fetchSaldo() {
         setLoading(true);
         setErrorMessage("");

         try {
            const session = getAuthSession();
            const nisSession = session?.role === "siswa" ? session.nis : null;
            if (!nisSession) {
               setStudent(null);
               setHistoryItems([]);
               return;
            }

            const { data: siswaData, error: siswaError } = await supabase
               .from("siswa")
               .select("nis,nama_siswa,saldo")
               .eq("nis", nisSession)
               .maybeSingle();

            if (siswaError) throw siswaError;
            const activeStudent = siswaData ?? null;
            if (!activeStudent) {
               setStudent(null);
               setHistoryItems([]);
               return;
            }

            setStudent(activeStudent);

            const [{ data: topupData, error: topupError }] = await Promise.all([
               supabase
                  .from("topup_saldo")
                  .select("id,jumlah,metode,tipe,keterangan,created_at")
                  .eq("nis_siswa", activeStudent.nis)
                  .order("created_at", { ascending: false }),
            ]);

            if (topupError) {
               setHistoryItems([]);
               return;
            }

            const topupHistory = (topupData ?? []).map((item) => {
               const isIncoming = ["Top-up", "Refund"].includes(item.tipe);
               return {
                  id: `topup_${item.id}`,
                  created_at: item.created_at,
                  amount: Number(item.jumlah),
                  type: isIncoming ? "Saldo Masuk" : "Saldo Keluar",
                  method: item.metode,
                  tipe: item.tipe,
                  description: item.keterangan || "",
               };
            });

            setHistoryItems(topupHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal memuat data saldo.");
         } finally {
            setLoading(false);
         }
      }

      fetchSaldo();
   }, []);

   return (
      <div className="page-content">
         <div className="page-header">
            <h1>Saldo Saya</h1>
            <p>Pantau saldo dan riwayat transaksi Anda.</p>
         </div>

         {loading ? (
            <Loading message="Memuat data saldo..." />
         ) : errorMessage ? (
            <div className="page-message page-message--error">{errorMessage}</div>
         ) : !student ? (
            <div className="page-message">Siswa tidak ditemukan.</div>
         ) : (
            <>
               <div className="saldo-overview">
                  <div className="saldo-card">
                     <div className="saldo-card__label">Saldo Saat Ini</div>
                     <div className="saldo-card__value">Rp {Number(student.saldo ?? 0).toLocaleString()}</div>
                     <div className="saldo-card__meta">NIS: {student.nis} · {student.nama_siswa}</div>
                  </div>
               </div>

               <div className="history-section">
                  <div className="history-section__title">Riwayat Saldo</div>

                  {historyItems.length === 0 ? (
                     <div className="page-message">Belum ada riwayat saldo.</div>
                  ) : (
                     <div className="history-table-wrap">
                        <table className="history-table">
                           <thead>
                              <tr>
                                 <th>Tanggal</th>
                                 <th>Jumlah</th>
                                 <th>Tipe</th>
                                 <th>Detail</th>
                              </tr>
                           </thead>
                           <tbody>
                              {historyItems.map((item) => (
                                 <tr key={item.id}>
                                    <td>{new Date(item.created_at).toLocaleString("id-ID")}</td>
                                    <td>Rp {Number(item.amount).toLocaleString()}</td>
                                    <td>
                                       <span className={item.type === "Saldo Masuk" ? "history-badge history-badge--in" : "history-badge history-badge--out"}>
                                          {item.type}
                                       </span>
                                    </td>
                                    <td>{formatHistoryDescription(item)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>
            </>
         )}
      </div>
   );
}
