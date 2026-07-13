"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./saldo.css";

const supabase = createClient();

export default function GuruSaldoPage() {
   const [teacher, setTeacher] = useState(null);
   const [historyItems, setHistoryItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [errorMessage, setErrorMessage] = useState("");
   const [paymentAmount, setPaymentAmount] = useState("");
   const [processingPayment, setProcessingPayment] = useState(false);
   const [paymentSuccess, setPaymentSuccess] = useState("");
   const [paymentError, setPaymentError] = useState("");

   function formatHistoryDescription(item) {
      if (item.type === "Saldo Masuk") {
         if (item.tipe === "Refund") {
            return "Refund - Saldo dikembalikan karena order ditolak";
         }
         if (item.tipe === "Hutang_Payment") {
            return "Pembayaran hutang dari saldo";
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

   async function handlePaymentHutang() {
      setPaymentError("");
      setPaymentSuccess("");

      if (!teacher) return;
      if (!paymentAmount || parseInt(paymentAmount) <= 0) {
         setPaymentError("Masukkan nominal pembayaran yang valid");
         return;
      }

      if (parseInt(paymentAmount) > teacher.total_hutang) {
         setPaymentError("Nominal pembayaran melebihi total hutang");
         return;
      }

      if (parseInt(paymentAmount) > teacher.saldo) {
         setPaymentError("Saldo tidak cukup untuk pembayaran");
         return;
      }

      setProcessingPayment(true);
      try {
         const response = await fetch("/api/payment-hutang", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               userType: "guru",
               userId: teacher.nip,
               amount: parseInt(paymentAmount),
               paymentMethod: "Saldo",
            }),
         });

         const result = await response.json();

         if (!response.ok) {
            throw new Error(result.error || "Gagal melakukan pembayaran");
         }

         setPaymentSuccess("Pembayaran hutang berhasil!");
         setPaymentAmount("");
         setTeacher((prev) =>
            prev
               ? {
                  ...prev,
                  saldo: result.newSaldo,
                  total_hutang: result.newHutang,
               }
               : prev
         );

         // Reload history
         const { data: historyData } = await supabase
            .from("topup_saldo_guru")
            .select("*")
            .eq("nip_guru", teacher.nip)
            .order("created_at", { ascending: false });

         if (historyData) {
            const topupHistory = historyData.map((item) => {
               const isIncoming = ["Top-up", "Refund", "Hutang_Payment"].includes(item.tipe);
               return {
                  id: `topup_${item.id}`,
                  type: isIncoming ? "Saldo Masuk" : "Saldo Keluar",
                  amount: Number(item.jumlah),
                  method: item.metode,
                  tipe: item.tipe,
                  description: item.keterangan || "",
                  date: item.created_at,
               };
            });
            setHistoryItems(topupHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));
         }
      } catch (error) {
         console.error(error);
         setPaymentError(error.message || "Gagal melakukan pembayaran");
      } finally {
         setProcessingPayment(false);
      }
   }

   useEffect(() => {
      async function fetchSaldo() {
         setLoading(true);
         setErrorMessage("");

         try {
            const session = getRoleSession("guru");
            const nipSession = session?.nip ?? null;
            if (!nipSession) {
               setTeacher(null);
               setHistoryItems([]);
               return;
            }

            const { data: guruData, error: guruError } = await supabase
               .from("guru")
               .select("nip,nama_guru,saldo,total_hutang,bidang_studi")
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
                  const isIncoming = ["Top-up", "Refund", "Hutang_Payment"].includes(item.tipe);
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
            <p>Pantau saldo dan kelola pembayaran hutang Anda.</p>
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
                     <div className="saldo-card__meta">NIP: {teacher.nip} · {teacher.nama_guru}</div>
                  </div>
                  {teacher.total_hutang > 0 && (
                     <div className="saldo-card saldo-card--hutang">
                        <div className="saldo-card__label">Total Hutang</div>
                        <div className="saldo-card__amount">
                           Rp {Number(teacher.total_hutang ?? 0).toLocaleString()}
                        </div>
                        <div className="saldo-card__meta">Hutang yang perlu dilunasi</div>
                     </div>
                  )}
               </div>

               {teacher.total_hutang > 0 && (
                  <div className="payment-section">
                     <div className="payment-section__title">Bayar Hutang Dengan Saldo</div>
                     {paymentSuccess && <div className="message message--success">{paymentSuccess}</div>}
                     {paymentError && <div className="message message--error">{paymentError}</div>}
                     <div className="payment-form">
                        <div className="form-group">
                           <label htmlFor="payment-amount">Nominal Pembayaran</label>
                           <input
                              id="payment-amount"
                              type="number"
                              placeholder="Masukkan nominal..."
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              min="1"
                              max={Math.min(teacher.saldo, teacher.total_hutang)}
                           />
                           <small>
                              Maksimal: Rp {Number(Math.min(teacher.saldo, teacher.total_hutang)).toLocaleString("id-ID")}
                           </small>
                        </div>
                        <button
                           className="btn btn--primary"
                           onClick={handlePaymentHutang}
                           disabled={processingPayment || teacher.saldo === 0}
                        >
                           {processingPayment ? "Memproses..." : "Bayar Sekarang"}
                        </button>
                     </div>
                  </div>
               )}

               <div className="history-section">
                  <div className="history-section__title">Riwayat Saldo</div>

                  {historyItems.length === 0 ? (
                     <div className="page-message">Tidak ada riwayat saldo.</div>
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
                                    <td>{new Date(item.date).toLocaleString("id-ID")}</td>
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
