"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import "./hutang.css";

const supabase = createClient();

export default function BukuHutangPage() {
   const [students, setStudents] = useState([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedStudent, setSelectedStudent] = useState(null);
   const [paymentMethod, setPaymentMethod] = useState("Tunai");
   const [paymentAmount, setPaymentAmount] = useState("");
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      fetchStudents();
   }, []);

   async function fetchStudents() {
      const { data, error } = await supabase
         .from("siswa")
         .select("nis,nama_siswa,kelas,total_hutang")
         .gt("total_hutang", 0)
         .order("total_hutang", { ascending: false });

      if (!error) {
         setStudents(data ?? []);
      }
   }

   const filteredStudents = students.filter((student) => {
      const search = searchTerm.toLowerCase();
      return (
         student.nama_siswa?.toLowerCase().includes(search) ||
         String(student.nis).toLowerCase().includes(search)
      );
   });

   function openConfirmModal(student) {
      setSelectedStudent(student);
      setPaymentMethod("Tunai");
      setPaymentAmount(student.total_hutang ?? "");
      setIsModalOpen(true);
   }

   async function handlePayOff() {
      if (!selectedStudent) return;

      const amount = Number(paymentAmount);
      const remaining = Number(selectedStudent.total_hutang) - amount;

      if (!amount || amount <= 0) {
         return alert("Masukkan nominal pembayaran yang valid");
      }

      if (amount > Number(selectedStudent.total_hutang)) {
         return alert("Nominal pembayaran tidak boleh lebih besar dari total hutang");
      }

      setLoading(true);
      try {
         const newTotal = Math.max(0, remaining);
         const { error: updateError } = await supabase
            .from("siswa")
            .update({ total_hutang: newTotal })
            .eq("nis", selectedStudent.nis);

         if (updateError) throw updateError;

         const trxId = `trx_${Date.now()}`;
         const { error: insertError } = await supabase.from("transaksi").insert({
            id: trxId,
            nis_siswa: selectedStudent.nis,
            metode_pembayaran: paymentMethod,
            status_pembayaran: amount >= Number(selectedStudent.total_hutang) ? "Lunas" : "Belum Lunas",
            total_bayar: amount,
         });

         if (insertError) throw insertError;

         setIsModalOpen(false);
         setSelectedStudent(null);
         setPaymentAmount("");
         await fetchStudents();
         alert("Pembayaran hutang berhasil disimpan");
      } catch (error) {
         console.error(error);
         alert("Gagal memproses pembayaran hutang");
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="hutang-page">
         <div className="hutang-page__header">
            <div>
               <h1 className="hutang-page__title">Buku Hutang</h1>
               <p className="hutang-page__subtitle">Kelola pelunasan hutang siswa koperasi.</p>
            </div>
         </div>

         <div className="hutang-page__toolbar">
            <input
               className="hutang-page__search"
               type="text"
               placeholder="Cari nama atau NIS siswa"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="hutang-page__table-wrap">
            <table className="hutang-table">
               <thead>
                  <tr>
                     <th className="hutang-table__head">NIS</th>
                     <th className="hutang-table__head">Nama Siswa</th>
                     <th className="hutang-table__head">Kelas</th>
                     <th className="hutang-table__head">Total Hutang</th>
                     <th className="hutang-table__head">Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredStudents.length === 0 ? (
                     <tr>
                        <td className="hutang-table__empty" colSpan="5">
                           Tidak ada data hutang yang perlu dilunasi.
                        </td>
                     </tr>
                  ) : (
                     filteredStudents.map((student) => (
                        <tr key={student.nis} className="hutang-table__row">
                           <td className="hutang-table__cell">{student.nis}</td>
                           <td className="hutang-table__cell">{student.nama_siswa}</td>
                           <td className="hutang-table__cell">{student.kelas}</td>
                           <td className="hutang-table__cell">Rp {Number(student.total_hutang).toLocaleString()}</td>
                           <td className="hutang-table__cell">
                              <button className="btn btn--primary" onClick={() => openConfirmModal(student)}>
                                 Lunasi Hutang
                              </button>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>

         {isModalOpen && selectedStudent && (
            <div className="modal" role="dialog" aria-modal="true">
               <div className="modal__content">
                  <h3 className="modal__title">Konfirmasi Pelunasan</h3>
                  <p className="modal__desc">
                     Lunasi hutang <strong>{selectedStudent.nama_siswa}</strong> sebesar <strong>Rp {Number(selectedStudent.total_hutang).toLocaleString()}</strong>?
                  </p>

                  <div className="modal__field">
                     <label htmlFor="payment-amount">Nominal Bayar</label>
                     <input
                        id="payment-amount"
                        className="modal__input"
                        type="number"
                        min="1"
                        max={selectedStudent.total_hutang}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Masukkan nominal bayar"
                     />
                     <p className="modal__hint">
                        Total hutang siswa: <strong>Rp {Number(selectedStudent.total_hutang).toLocaleString()}</strong>
                     </p>
                  </div>

                  <div className="modal__options">
                     <label className="modal__option">
                        <input
                           type="radio"
                           name="paymentMethod"
                           value="Tunai"
                           checked={paymentMethod === "Tunai"}
                           onChange={() => setPaymentMethod("Tunai")}
                        />
                        <span>Tunai</span>
                     </label>
                     <label className="modal__option">
                        <input
                           type="radio"
                           name="paymentMethod"
                           value="QRIS"
                           checked={paymentMethod === "QRIS"}
                           onChange={() => setPaymentMethod("QRIS")}
                        />
                        <span>QRIS/Transfer</span>
                     </label>
                  </div>

                  <div className="modal__actions">
                     <button className="btn" onClick={() => setIsModalOpen(false)}>
                        Batal
                     </button>
                     <button className="btn btn--primary" onClick={handlePayOff} disabled={loading}>
                        {loading
                           ? "Memproses..."
                           : Number(paymentAmount) >= Number(selectedStudent.total_hutang)
                              ? "Konfirmasi Lunas"
                              : "Bayar Sebagian"}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
