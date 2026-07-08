"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import "./hutang.css";

const supabase = createClient();

export default function BukuHutangPage() {
   const [selectedType, setSelectedType] = useState("siswa");
   const [students, setStudents] = useState([]);
   const [teachers, setTeachers] = useState([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedEntry, setSelectedEntry] = useState(null);
   const [paymentMethod, setPaymentMethod] = useState("Tunai");
   const [paymentAmount, setPaymentAmount] = useState("");
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      fetchStudents();
      fetchTeachers();
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

   async function fetchTeachers() {
      const { data, error } = await supabase
         .from("guru")
         .select("nip,nama_guru,bidang_studi,total_hutang")
         .gt("total_hutang", 0)
         .order("total_hutang", { ascending: false });

      if (!error) {
         setTeachers(data ?? []);
      }
   }

   const filteredItems = (selectedType === "siswa" ? students : teachers).filter((item) => {
      const search = searchTerm.toLowerCase();
      return selectedType === "siswa"
         ? item.nama_siswa?.toLowerCase().includes(search) || String(item.nis).toLowerCase().includes(search)
         : item.nama_guru?.toLowerCase().includes(search) || String(item.nip).toLowerCase().includes(search);
   });

   function openConfirmModal(entry) {
      setSelectedEntry({ ...entry, type: selectedType });
      setPaymentMethod("Tunai");
      setPaymentAmount(entry.total_hutang ?? "");
      setIsModalOpen(true);
   }

   async function handlePayOff() {
      if (!selectedEntry) return;

      const amount = Number(paymentAmount);
      const remaining = Number(selectedEntry.total_hutang) - amount;

      if (!amount || amount <= 0) {
         return alert("Masukkan nominal pembayaran yang valid");
      }

      if (amount > Number(selectedEntry.total_hutang)) {
         return alert("Nominal pembayaran tidak boleh lebih besar dari total hutang");
      }

      setLoading(true);
      try {
         const newTotal = Math.max(0, remaining);
         const updateTarget = selectedEntry.type === "siswa" ? "siswa" : "guru";
         const updateKey = selectedEntry.type === "siswa" ? "nis" : "nip";
         const updateValue = selectedEntry.type === "siswa" ? selectedEntry.nis : selectedEntry.nip;

         const { error: updateError } = await supabase
            .from(updateTarget)
            .update({ total_hutang: newTotal })
            .eq(updateKey, updateValue);

         if (updateError) throw updateError;

         const trxId = `trx_${Date.now()}`;
         const insertData = {
            id: trxId,
            metode_pembayaran: "Pelunasan",
            status_pembayaran: amount >= Number(selectedEntry.total_hutang) ? "Lunas" : "Belum Lunas",
            total_bayar: amount,
         };

         if (selectedEntry.type === "siswa") {
            insertData.nis_siswa = selectedEntry.nis;
         } else {
            insertData.nip_guru = selectedEntry.nip;
         }

         const { error: insertError } = await supabase.from("transaksi").insert(insertData);

         if (insertError) throw insertError;

         setIsModalOpen(false);
         setSelectedEntry(null);
         setPaymentAmount("");
         await Promise.all([fetchStudents(), fetchTeachers()]);
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
               <p className="hutang-page__subtitle">Kelola pelunasan hutang koperasi untuk siswa dan guru.</p>
            </div>
         </div>

         <div className="hutang-page__toolbar">
            <div className="hutang-page__controls">
               <select className="hutang-page__type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
               </select>
               <input
                  className="hutang-page__search"
                  type="text"
                  placeholder={`Cari nama atau ${selectedType === "siswa" ? "NIS siswa" : "NIP guru"}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         <div className="hutang-page__table-wrap">
            <table className="hutang-table">
               <thead>
                  <tr>
                     <th className="hutang-table__head">{selectedType === "siswa" ? "NIS" : "NIP"}</th>
                     <th className="hutang-table__head">{selectedType === "siswa" ? "Nama Siswa" : "Nama Guru"}</th>
                     <th className="hutang-table__head">{selectedType === "siswa" ? "Kelas" : "Bidang Studi"}</th>
                     <th className="hutang-table__head">Total Hutang</th>
                     <th className="hutang-table__head">Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredItems.length === 0 ? (
                     <tr>
                        <td className="hutang-table__empty" colSpan="5">
                           Tidak ada data hutang yang perlu dilunasi.
                        </td>
                     </tr>
                  ) : (
                     filteredItems.map((item) => (
                        <tr key={selectedType === "siswa" ? item.nis : item.nip} className="hutang-table__row">
                           <td className="hutang-table__cell">{selectedType === "siswa" ? item.nis : item.nip}</td>
                           <td className="hutang-table__cell">{selectedType === "siswa" ? item.nama_siswa : item.nama_guru}</td>
                           <td className="hutang-table__cell">{selectedType === "siswa" ? item.kelas : item.bidang_studi}</td>
                           <td className="hutang-table__cell">Rp {Number(item.total_hutang).toLocaleString()}</td>
                           <td className="hutang-table__cell">
                              <button className="btn btn--primary" onClick={() => openConfirmModal(item)}>
                                 Lunasi Hutang
                              </button>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>

         {isModalOpen && selectedEntry && (
            <div className="modal" role="dialog" aria-modal="true">
               <div className="modal__content">
                  <h3 className="modal__title">Konfirmasi Pelunasan</h3>
                  <p className="modal__desc">
                     Lunasi hutang <strong>{selectedEntry.type === "siswa" ? selectedEntry.nama_siswa : selectedEntry.nama_guru}</strong> sebesar <strong>Rp {Number(selectedEntry.total_hutang).toLocaleString()}</strong>?
                  </p>

                  <div className="modal__field">
                     <label htmlFor="payment-amount">Nominal Bayar</label>
                     <input
                        id="payment-amount"
                        className="modal__input"
                        type="number"
                        min="1"
                        max={selectedEntry.total_hutang}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Masukkan nominal bayar"
                     />
                     <p className="modal__hint">
                        Total hutang {selectedEntry.type === "siswa" ? "siswa" : "guru"}: <strong>Rp {Number(selectedEntry.total_hutang).toLocaleString()}</strong>
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
                           : Number(paymentAmount) >= Number(selectedEntry.total_hutang)
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
