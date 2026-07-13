"use client";

import { useSaldo } from "@/hooks/useSaldo";
import Loading from "@/components/Loading";

export default function SiswaSaldoPage() {
   const {
      profile: student,
      historyItems,
      loading,
      errorMessage,
      paymentAmount,
      setPaymentAmount,
      processingPayment,
      paymentSuccess,
      paymentError,
      handlePaymentHutang,
      formatHistoryDescription,
   } = useSaldo({ role: "siswa" });

   return (
      <div className="page-content">
         <div className="page-header">
            <h1>Saldo Saya</h1>
            <p>Pantau saldo dan kelola pembayaran hutang Anda.</p>
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
                     <div className="saldo-card__value">Rp {Number(student.saldo ?? 0).toLocaleString("id-ID")}</div>
                     <div className="saldo-card__meta">NIS: {student.nis} · {student.nama_siswa} ({student.kelas})</div>
                  </div>
                  {student.total_hutang > 0 && (
                     <div className="saldo-card saldo-card--hutang">
                        <div className="saldo-card__label">Total Hutang</div>
                        <div className="saldo-card__value">Rp {Number(student.total_hutang ?? 0).toLocaleString("id-ID")}</div>
                        <div className="saldo-card__meta">Hutang yang perlu dilunasi</div>
                     </div>
                  )}
               </div>

               {student.total_hutang > 0 && (
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
                              max={Math.min(student.saldo, student.total_hutang)}
                           />
                           <small>
                              Maksimal: Rp {Number(Math.min(student.saldo, student.total_hutang)).toLocaleString("id-ID")}
                           </small>
                        </div>
                        <button
                           className="btn btn--primary"
                           onClick={handlePaymentHutang}
                           disabled={processingPayment || student.saldo === 0}
                        >
                           {processingPayment ? "Memproses..." : "Bayar Sekarang"}
                        </button>
                     </div>
                  </div>
               )}

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
                                 <th>Nominal</th>
                                 <th>Jenis</th>
                                 <th>Keterangan</th>
                              </tr>
                           </thead>
                           <tbody>
                              {historyItems.map((item) => (
                                 <tr key={item.id}>
                                    <td>{new Date(item.created_at).toLocaleString("id-ID")}</td>
                                    <td>Rp {Number(item.amount).toLocaleString("id-ID")}</td>
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
