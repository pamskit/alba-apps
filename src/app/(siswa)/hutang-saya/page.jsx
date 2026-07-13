"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
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

   async function fetchData() {
      setLoading(true);
      setErrorMessage("");

      try {
         const session = getRoleSession("siswa");
         const nisSession = session?.nis ?? null;
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
            .in("metode_pembayaran", ["Hutang", "Pelunasan"])
            .order("created_at", { ascending: false });

         const { data: pendingOrdersData, error: pendingOrdersError } = await supabase
            .from("order_siswa")
            .select("id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran")
            .eq("nis_siswa", nisSession)
            .eq("metode_pembayaran", "Hutang")
            .order("created_at", { ascending: false });

         if (historyError) throw historyError;
         if (pendingOrdersError) throw pendingOrdersError;

         // Combine transaksi and pending orders, then sort by date
         const combined = [
            ...(historyData ?? []).map((t) => ({ ...t, total_harga: t.total_bayar, source: "transaksi" })),
            ...(pendingOrdersData ?? []).map((o) => ({ ...o, source: "order" })),
         ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

         setHutangHistory(combined);
      } catch (error) {
         console.error(error);
         setErrorMessage("Gagal memuat data hutang.");
      } finally {
         setLoading(false);
      }
   }

   useEffect(() => {
      async function loadHutangData() {
         await fetchData();
      }

      void loadHutangData();
   }, []);

   function getHutangTransactionLabel(item) {
      // For order_siswa entries
      if (item.source === "order") {
         if (item.status_order === "Menunggu") return "Hutang Pending";
         if (item.status_order === "Dikonfirmasi") return "Hutang Dikonfirmasi";
         if (item.status_order === "Ditolak") return "Hutang Ditolak";
         return "Ajukan Hutang";
      }

      // For transaksi entries
      if (item.metode_pembayaran === "Hutang") return item.status_pembayaran === "Ditolak" ? "Hutang Ditolak" : "Hutang Dikonfirmasi";
      if (item.metode_pembayaran === "Pelunasan") return "Bayar Hutang";
      return item.metode_pembayaran ?? "-";
   }

   async function handlePayHutang() {
      if (!student) return;
      const amount = Number(paymentAmount);
      if (!amount || amount <= 0) {
         return toast.error("Masukkan nominal pembayaran yang valid.");
      }

      const currentHutang = Number(student.total_hutang ?? 0);
      if (amount > currentHutang) {
         return toast.error("Nominal pembayaran tidak boleh melebihi total hutang.");
      }

      if (amount > Number(student.saldo ?? 0)) {
         return toast.error("Saldo tidak cukup untuk membayar hutang ini.");
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

         // Create saldo history entry
         const { error: historyError } = await supabase.from("topup_saldo").insert({
            nis_siswa: student.nis,
            jumlah: amount,
            metode: "Pembayaran Hutang",
            tipe: "Hutang_Payment",
            keterangan: "Pelunasan hutang dari saldo",
         });

         if (historyError) {
            console.error("Warning: Could not record saldo history:", historyError);
         }

         setStudent({ ...student, saldo: newSaldo, total_hutang: newHutang });
         setPaymentAmount(newHutang);
         await fetchData();

         toast.success("Pembayaran hutang berhasil.");
      } catch (error) {
         console.error(error);
         toast.error("Gagal memproses pembayaran hutang.");
      } finally {
         setProcessing(false);
      }
   }

   return (
      <div className="siswa-hutang">
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
               <div className="hutang-overview">
                  <div className="hutang-card">
                     <div className="hutang-card__label">Total Hutang</div>
                     <div className={`hutang-card__amount ${student.total_hutang === 0 ? "hutang-card__amount--zero" : ""}`}>
                        Rp {Number(student.total_hutang ?? 0).toLocaleString()}
                     </div>
                  </div>

                  <div className="hutang-card">
                     <div className="hutang-card__label">Saldo Tersedia</div>
                     <div className="hutang-card__amount" style={{ color: "#27ae60" }}>
                        Rp {Number(student.saldo ?? 0).toLocaleString()}
                     </div>
                  </div>
               </div>

               {student.total_hutang > 0 && (
                  <div className="hutang-form">
                     <div className="hutang-form__title">Bayar Hutang</div>
                     <div className="form-group">
                        <label>Nominal Pembayaran</label>
                        <input
                           type="number"
                           value={paymentAmount}
                           onChange={(e) => setPaymentAmount(e.target.value)}
                           min="0"
                           max={student.total_hutang}
                           disabled={processing}
                        />
                     </div>
                     <button
                        onClick={handlePayHutang}
                        disabled={processing}
                        className="btn btn--primary"
                        style={{ width: "100%" }}
                     >
                        {processing ? "Memproses..." : "Bayar Hutang"}
                     </button>
                  </div>
               )}

               <div className="hutang-history">
                  <div className="hutang-history__title">Riwayat Pesanan dengan Hutang</div>
                  {hutangHistory.length === 0 ? (
                     <div className="page-message">Tidak ada riwayat hutang.</div>
                  ) : (
                     <table className="history-table">
                        <thead>
                           <tr>
                              <th>ID</th>
                              <th>Jumlah</th>
                              <th>Tipe</th>
                              <th>Status</th>
                              <th>Tanggal</th>
                           </tr>
                        </thead>
                        <tbody>
                           {hutangHistory.map((item) => {
                              const getHutangLabel = () => {
                                 if (item.source === "order") {
                                    if (item.status_order === "Menunggu") return "Hutang Pending";
                                    if (item.status_order === "Dikonfirmasi") return "Hutang Dikonfirmasi";
                                    if (item.status_order === "Ditolak") return "Hutang Ditolak";
                                    return "Ajukan Hutang";
                                 }
                                 if (item.metode_pembayaran === "Hutang") return item.status_pembayaran === "Ditolak" ? "Hutang Ditolak" : "Hutang Dikonfirmasi";
                                 if (item.metode_pembayaran === "Pelunasan") return "Bayar Hutang";
                                 return item.metode_pembayaran ?? "-";
                              };

                              const getStatusClass = () => {
                                 if (item.source === "order") {
                                    if (item.status_order === "Menunggu") return "status-pending";
                                    if (item.status_order === "Dikonfirmasi") return "status-confirmed";
                                    if (item.status_order === "Ditolak") return "status-rejected";
                                 } else {
                                    if (item.status_pembayaran === "Ditolak") return "status-rejected";
                                    if (item.status_pembayaran === "Belum Lunas") return "status-unpaid";
                                    return "status-confirmed";
                                 }
                                 return "";
                              };

                              return (
                                 <tr key={`${item.source}-${item.id}`}>
                                    <td>{item.id.substring(0, 12)}</td>
                                    <td>Rp {Number(item.total_harga ?? item.total_bayar).toLocaleString()}</td>
                                    <td>{getHutangLabel()}</td>
                                    <td>
                                       <span className={`status-badge ${getStatusClass()}`}>
                                          {item.source === "order" ? item.status_order : item.status_pembayaran}
                                       </span>
                                    </td>
                                    <td>{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  )}
               </div>
            </>
         )}
      </div>
   );
}
