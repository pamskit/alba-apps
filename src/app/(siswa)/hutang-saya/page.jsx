"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./hutang.css";

const supabase = createClient();

export default function SiswaHutangPage() {
   const [student, setStudent] = useState(null);
   const [hutangHistory, setHutangHistory] = useState([]);
   const [loading, setLoading] = useState(true);
   const [errorMessage, setErrorMessage] = useState("");
   const [paymentAmount, setPaymentAmount] = useState("");
   const [processing, setProcessing] = useState(false);

   useEffect(() => {
      async function fetchData() {
         setLoading(true);
         setErrorMessage("");

         try {
            const session = getAuthSession();
            const nisSession = session?.role === "siswa" ? session.nis : null;
            if (!nisSession) {
               setStudent(null);
               setHutangHistory([]);
               return;
            }

            const { data: siswaData, error: siswaError } = await supabase
               .from("siswa")
               .select("nis,nama_siswa,kelas,saldo,total_hutang")
               .eq("nis", nisSession)
               .maybeSingle();

            if (siswaError) throw siswaError;
            if (!siswaData) {
               setStudent(null);
               setHutangHistory([]);
               return;
            }

            setStudent(siswaData);
            setPaymentAmount(siswaData.total_hutang ?? "");

            const { data: historyData, error: historyError } = await supabase
               .from("transaksi")
               .select("id,created_at,total_bayar,metode_pembayaran,status_pembayaran")
               .eq("nis_siswa", nisSession)
               .order("created_at", { ascending: false });

            if (historyError) throw historyError;
            setHutangHistory(historyData ?? []);
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal memuat data hutang.");
         } finally {
            setLoading(false);
         }
      }

      fetchData();
   }, []);

   function getHutangTransactionLabel(item) {
      if (item.metode_pembayaran === "Hutang") return "Ajukan Hutang";
      if (item.metode_pembayaran === "Pelunasan") return "Bayar Hutang";
      if (item.metode_pembayaran === "Tunai") return "Pembayaran Tunai";
      if (item.metode_pembayaran === "QRIS") return "Pembayaran QRIS";
      return item.metode_pembayaran ?? "-";
   }

   async function handlePayHutang() {
      if (!student) return;
      const amount = Number(paymentAmount);
      if (!amount || amount <= 0) {
         return alert("Masukkan nominal pembayaran yang valid.");
      }

      const currentHutang = Number(student.total_hutang ?? 0);
      if (amount > currentHutang) {
         return alert("Nominal pembayaran tidak boleh melebihi total hutang.");
      }

      if (amount > Number(student.saldo ?? 0)) {
         return alert("Saldo tidak cukup untuk membayar hutang ini.");
      }

      setProcessing(true);
      try {
         const newSaldo = Number(student.saldo ?? 0) - amount;
         const newHutang = Math.max(0, currentHutang - amount);

         const { error: updateError } = await supabase
            .from("siswa")
            .update({ saldo: newSaldo, total_hutang: newHutang })
            .eq("nis", student.nis);

         if (updateError) throw updateError;

         const trxId = `trx_${Date.now()}`;
         const { error: insertError } = await supabase.from("transaksi").insert({
            id: trxId,
            nis_siswa: student.nis,
            metode_pembayaran: "Pelunasan",
            status_pembayaran: newHutang === 0 ? "Lunas" : "Belum Lunas",
            total_bayar: amount,
         });

         if (insertError) throw insertError;

         setStudent({ ...student, saldo: newSaldo, total_hutang: newHutang });
         setPaymentAmount(newHutang);
         setHutangHistory((prev) => [
            {
               id: trxId,
               created_at: new Date().toISOString(),
               total_bayar: amount,
               metode_pembayaran: "Pelunasan",
               status_pembayaran: newHutang === 0 ? "Lunas" : "Belum Lunas",
            },
            ...prev,
         ]);

         alert("Pembayaran hutang berhasil.");
      } catch (error) {
         console.error(error);
         alert("Gagal memproses pembayaran hutang.");
      } finally {
         setProcessing(false);
      }
   }

   return (
      <div className="page-content">
         <div className="page-header">
            <h1>Hutang Saya</h1>
            <p>Gunakan saldo Anda untuk membayar hutang dan lihat riwayat transaksi.</p>
         </div>

         {loading ? (
            <Loading message="Memuat data hutang..." />
         ) : errorMessage ? (
            <div className="page-message page-message--error">{errorMessage}</div>
         ) : !student ? (
            <div className="page-message">Siswa tidak ditemukan.</div>
         ) : (
            <>
               <div className="hutang-summary-grid">
                  <div className="hutang-card">
                     <span className="hutang-card__label">Saldo saat ini</span>
                     <strong className="hutang-card__value">Rp {Number(student.saldo ?? 0).toLocaleString()}</strong>
                  </div>
                  <div className="hutang-card hutang-card--debt">
                     <span className="hutang-card__label">Total hutang</span>
                     <strong className="hutang-card__value">Rp {Number(student.total_hutang ?? 0).toLocaleString()}</strong>
                  </div>
               </div>

               <div className="pay-card">
                  <div className="pay-card__header">
                     <div>
                        <h2>Bayar dengan Saldo</h2>
                        <p>Masukkan nominal pembayaran dari saldo yang tersedia.</p>
                     </div>
                  </div>

                  <div className="pay-card__body">
                     <label htmlFor="paymentAmount">Nominal Pembayaran</label>
                     <input
                        id="paymentAmount"
                        type="number"
                        min="1"
                        max={student.total_hutang ?? 0}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="input-field"
                        placeholder="Masukkan nominal bayar"
                     />
                     <p className="hint-text">Saldo tersedia: Rp {Number(student.saldo ?? 0).toLocaleString()}</p>
                  </div>

                  <div className="pay-card__actions">
                     <button className="btn" onClick={handlePayHutang} disabled={processing || Number(student.total_hutang) === 0}>
                        {processing ? "Memproses..." : "Bayar Hutang"}
                     </button>
                  </div>
               </div>

               <div className="history-section">
                  <h2>Riwayat Hutang</h2>
                  <p>Catatan transaksi hutang dan pembayaran, termasuk ajukan hutang dan pelunasan.</p>

                  {hutangHistory.length === 0 ? (
                     <div className="page-message">Belum ada riwayat hutang.</div>
                  ) : (
                     <div className="history-table-wrap">
                        <table className="history-table">
                           <thead>
                              <tr>
                                 <th>Tanggal</th>
                                 <th>Jumlah</th>
                                 <th>Tipe</th>
                                 <th>Status</th>
                              </tr>
                           </thead>
                           <tbody>
                              {hutangHistory.map((item) => (
                                 <tr key={item.id}>
                                    <td>{new Date(item.created_at).toLocaleString("id-ID")}</td>
                                    <td>Rp {Number(item.total_bayar).toLocaleString()}</td>
                                    <td>{getHutangTransactionLabel(item)}</td>
                                    <td>{item.status_pembayaran}</td>
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
