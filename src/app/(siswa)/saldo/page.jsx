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

            const [{ data: topupData, error: topupError }, { data: paymentData, error: paymentError }] = await Promise.all([
               supabase
                  .from("topup_saldo")
                  .select("id,jumlah,metode,keterangan,created_at")
                  .eq("nis_siswa", activeStudent.nis)
                  .order("created_at", { ascending: false }),
               supabase
                  .from("transaksi")
                  .select("id,total_bayar,metode_pembayaran,status_pembayaran,created_at")
                  .eq("nis_siswa", activeStudent.nis)
                  .eq("metode_pembayaran", "Pelunasan")
                  .order("created_at", { ascending: false }),
            ]);

            if (topupError || paymentError) {
               setHistoryItems([]);
               return;
            }

            const topupHistory = (topupData ?? []).map((item) => ({
               id: `topup_${item.id}`,
               created_at: item.created_at,
               amount: Number(item.jumlah),
               type: "Saldo Masuk",
               method: item.metode,
               description: item.keterangan || "Top-up saldo",
            }));

            const outgoingHistory = (paymentData ?? []).map((item) => ({
               id: `trx_${item.id}`,
               created_at: item.created_at,
               amount: Number(item.total_bayar),
               type: "Saldo Keluar",
               method: "Pembayaran Hutang",
               description: item.status_pembayaran || "",
            }));

            setHistoryItems([
               ...topupHistory,
               ...outgoingHistory,
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
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
            <h1>Saldo Siswa</h1>
            <p>Informasi saldo dan riwayat mutasi saldo masuk dan keluar untuk akun Anda.</p>
         </div>

         {loading ? (
            <Loading message="Memuat data saldo..." />
         ) : errorMessage ? (
            <div className="page-message page-message--error">{errorMessage}</div>
         ) : !student ? (
            <div className="page-message">Siswa tidak ditemukan.</div>
         ) : (
            <>
               <div className="saldo-card">
                  <div className="saldo-card__label">Saldo saat ini</div>
                  <div className="saldo-card__value">Rp {Number(student.saldo ?? 0).toLocaleString()}</div>
                  <div className="saldo-card__meta">NIS: {student.nis} · {student.nama_siswa}</div>
               </div>

               <div className="history-section">
                  <h2>Riwayat Saldo</h2>
                  <p>Catatan saldo masuk dan keluar untuk akun Anda.</p>

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
                                 <th>Keterangan</th>
                              </tr>
                           </thead>
                           <tbody>
                              {historyItems.map((item) => (
                                 <tr key={item.id}>
                                    <td>{new Date(item.created_at).toLocaleString("id-ID")}</td>
                                    <td>Rp {Number(item.amount).toLocaleString()}</td>
                                    <td>{item.type}</td>
                                    <td>{item.description || item.method || "-"}</td>
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
