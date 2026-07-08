"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./saldo.css";

const supabase = createClient();

export default function GuruSaldoPage() {
   const [teacher, setTeacher] = useState(null);
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
            const nipSession = session?.role === "guru" ? session.nip : null;
            if (!nipSession) {
               setTeacher(null);
               setHistoryItems([]);
               return;
            }

            const { data: guruData, error: guruError } = await supabase
               .from("guru")
               .select("nip,nama_guru,saldo")
               .eq("nip", nipSession)
               .maybeSingle();

            if (guruError) throw guruError;
            const activeTeacher = guruData ?? null;
            if (!activeTeacher) {
               setTeacher(null);
               setHistoryItems([]);
               return;
            }

            setTeacher(activeTeacher);

            const [{ data: topupData, error: topupError }] = await Promise.all([
               supabase
                  .from("topup_saldo_guru")
                  .select("id,jumlah,metode,tipe,keterangan,created_at")
                  .eq("nip_guru", activeTeacher.nip)
                  .order("created_at", { ascending: false }),
            ]);

            if (topupError) {
               setHistoryItems([]);
               return;
            }

            const combinedHistory = [];

            if (topupData) {
               topupData.forEach((item) => {
                  const isIncoming = ["Top-up", "Refund"].includes(item.tipe);
                  combinedHistory.push({
                     id: `topup_${item.id}`,
                     type: isIncoming ? "Saldo Masuk" : "Saldo Keluar",
                     amount: item.jumlah,
                     method: item.metode,
                     tipe: item.tipe,
                     description: item.keterangan,
                     date: item.created_at,
                  });
               });
            }

            combinedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistoryItems(combinedHistory);
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal memuat riwayat saldo.");
         } finally {
            setLoading(false);
         }
      }

      fetchSaldo();
   }, []);

   return (
      <div className="guru-saldo">
         <div className="page-header">
            <h1>Saldo Saya</h1>
            <p>Pantau saldo dan riwayat top-up Anda.</p>
         </div>

         {loading ? (
            <Loading message="Memuat saldo..." />
         ) : errorMessage ? (
            <div className="page-message page-message--error">{errorMessage}</div>
         ) : !teacher ? (
            <div className="page-message">Guru tidak ditemukan.</div>
         ) : (
            <>
               <div className="saldo-overview">
                  <div className="saldo-card">
                     <div className="saldo-card__label">Saldo Saat Ini</div>
                     <div className="saldo-card__amount">
                        Rp {Number(teacher.saldo ?? 0).toLocaleString()}
                     </div>
                  </div>
               </div>

               <div className="saldo-history">
                  <div className="saldo-history__title">Riwayat Saldo</div>
                  {historyItems.length === 0 ? (
                     <div className="page-message">Tidak ada riwayat saldo.</div>
                  ) : (
                     <table className="history-table">
                        <thead>
                           <tr>
                              <th>Jenis</th>
                              <th>Jumlah</th>
                              <th>Keterangan</th>
                              <th>Tanggal</th>
                           </tr>
                        </thead>
                        <tbody>
                           {historyItems.map((item) => (
                              <tr key={item.id}>
                                 <td>
                                    <span style={{ color: item.type === "Saldo Masuk" ? "#27ae60" : "#e74c3c", fontWeight: "600" }}>
                                       {item.type === "Saldo Masuk" ? "+" : "-"} {item.type}
                                    </span>
                                 </td>
                                 <td>Rp {Number(item.amount).toLocaleString()}</td>
                                 <td>{formatHistoryDescription(item)}</td>
                                 <td>{new Date(item.date).toLocaleDateString("id-ID")}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </>
         )}
      </div>
   );
}
