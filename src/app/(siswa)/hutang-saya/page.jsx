"use client";

import { useHutang } from "@/hooks/useHutang";
import { getHutangLabel, getHutangStatusClass } from "@/utils/hutang";
import Loading from "@/components/Loading";

export default function SiswaHutangPage() {
   const {
      profile: student,
      history: hutangHistory,
      paymentAmount,
      setPaymentAmount,
      loading,
      error,
      processingPayment,
      paymentError,
      paymentSuccess,
      handlePayHutang,
   } = useHutang({ role: "siswa" });

   return (
      <div className="page-content">
         <div className="page-header">
            <h1>Hutang Saya</h1>
            <p>Gunakan saldo Anda untuk membayar hutang dan lihat riwayat transaksi.</p>
         </div>

         {loading ? (
            <Loading message="Memuat data hutang..." />
         ) : error ? (
            <div className="page-message page-message--error">{error?.message ?? "Gagal memuat data hutang."}</div>
         ) : !student ? (
            <div className="page-message">Siswa tidak ditemukan.</div>
         ) : (
            <>
               <div className="hutang-overview">
                  <div className="hutang-card">
                     <div className="hutang-card__label">Total Hutang</div>
                     <div className={`hutang-card__amount ${student.total_hutang === 0 ? "hutang-card__amount--zero" : ""}`}>
                        Rp {Number(student.total_hutang ?? 0).toLocaleString("id-ID")}
                     </div>
                  </div>

                  <div className="hutang-card">
                     <div className="hutang-card__label">Saldo Tersedia</div>
                     <div className="hutang-card__amount" style={{ color: "#27ae60" }}>
                        Rp {Number(student.saldo ?? 0).toLocaleString("id-ID")}
                     </div>
                  </div>
               </div>

               {student.total_hutang > 0 && (
                  <div className="hutang-form">
                     <div className="hutang-form__title">Bayar Hutang</div>
                     {paymentSuccess && <div className="message message--success">{paymentSuccess}</div>}
                     {paymentError && <div className="message message--error">{paymentError}</div>}
                     <div className="form-group">
                        <label>Nominal Pembayaran</label>
                        <input
                           type="number"
                           value={paymentAmount}
                           onChange={(e) => setPaymentAmount(e.target.value)}
                           min="0"
                           max={student.total_hutang}
                           disabled={processingPayment}
                        />
                     </div>
                     <button onClick={handlePayHutang} disabled={processingPayment} className="btn btn--primary">
                        {processingPayment ? "Memproses..." : "Bayar Hutang"}
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
                              <th>Tanggal</th>
                              <th>Jenis</th>
                              <th>Status</th>
                              <th>Nominal</th>
                           </tr>
                        </thead>
                        <tbody>
                           {hutangHistory.map((item) => (
                              <tr key={`${item.source}-${item.id}`}>
                                 <td>{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                                 <td>{getHutangLabel(item)}</td>
                                 <td>
                                    <span className={`status-badge ${getHutangStatusClass(item)}`}>
                                       {item.source === "order" ? item.status_order ?? item.status_pembayaran : item.payment_status ?? item.status_pembayaran}
                                    </span>
                                 </td>
                                 <td>Rp {Number(item.total_harga ?? item.amount_total ?? item.amount ?? 0).toLocaleString("id-ID")}</td>
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
