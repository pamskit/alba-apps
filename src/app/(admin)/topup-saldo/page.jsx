"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import "./topup-saldo.css";

const supabase = createClient();

export default function AdminTopupSaldoPage() {
   const [selectedType, setSelectedType] = useState("siswa");
   const [siswa, setSiswa] = useState([]);
   const [guru, setGuru] = useState([]);
   const [selectedSiswa, setSelectedSiswa] = useState("");
   const [selectedGuru, setSelectedGuru] = useState("");
   const [amount, setAmount] = useState("");
   const [method, setMethod] = useState("Tunai");
   const [note, setNote] = useState("");
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      fetchSiswa();
      fetchGuru();
   }, []);

   async function fetchSiswa() {
      const { data, error } = await supabase
         .from("siswa")
         .select("nis,nama_siswa,kelas,saldo")
         .order("nis", { ascending: true });

      if (error) {
         console.error(error);
         return;
      }

      setSiswa(data ?? []);
   }

   async function fetchGuru() {
      const { data, error } = await supabase
         .from("guru")
         .select("nip,nama_guru,bidang_studi,saldo")
         .order("nip", { ascending: true });

      if (error) {
         console.error(error);
         return;
      }

      setGuru(data ?? []);
   }

   const siswaOptions = siswa.map((item) => ({
      value: item.nis,
      label: `${item.nis} - ${item.nama_siswa} (${item.kelas}) - Saldo: Rp ${Number(item.saldo ?? 0).toLocaleString()}`,
   }));

   const guruOptions = guru.map((item) => ({
      value: item.nip,
      label: `${item.nip} - ${item.nama_guru} (${item.bidang_studi ?? "-"}) - Saldo: Rp ${Number(item.saldo ?? 0).toLocaleString()}`,
   }));

   const selectedOption = selectedType === "siswa"
      ? siswaOptions.find((opt) => opt.value === Number(selectedSiswa))
      : guruOptions.find((opt) => opt.value === Number(selectedGuru));

   const selectedAccount = selectedType === "siswa"
      ? siswa.find((item) => item.nis === Number(selectedSiswa))
      : guru.find((item) => item.nip === Number(selectedGuru));

   async function handleTopup(event) {
      event.preventDefault();
      const amountValue = Number(amount);

      if (!amountValue || amountValue <= 0) return toast.error("Jumlah top-up harus lebih besar dari 0.");

      const isSiswa = selectedType === "siswa";
      const selectedId = isSiswa ? selectedSiswa : selectedGuru;
      if (!selectedId) return toast.error(`Pilih ${isSiswa ? "siswa" : "guru"} terlebih dahulu.`);

      setLoading(true);
      try {
         const response = await fetch("/api/topup-saldo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               userType: selectedType,
               userId: Number(selectedId),
               amount: amountValue,
               metode: method,
               note: note || `Top-up saldo oleh admin`,
            }),
         });

         const result = await response.json();
         if (!response.ok) {
            throw new Error(result.error || "Gagal melakukan top-up saldo.");
         }

         toast.success(result.message || "Top-up saldo berhasil.");
         setAmount("");
         setNote("");
         setSelectedSiswa("");
         setSelectedGuru("");
         await Promise.all([fetchSiswa(), fetchGuru()]);
      } catch (error) {
         console.error(error);
         toast.error(error.message || "Gagal melakukan top-up saldo.");
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="page-content topup-page">
         <div className="page-header topup-page__header">
            <h1>Top-Up Saldo</h1>
            <p>Tambahkan saldo siswa atau guru tanpa mencampur dengan transaksi kasir.</p>

            <div className="topup-page__stats" aria-label="Ringkasan akun">
               <div className="topup-page__stat-card">
                  <span className="topup-page__stat-label">Data siswa tersedia</span>
                  <strong className="topup-page__stat-value">{siswa.length}</strong>
               </div>
               <div className="topup-page__stat-card">
                  <span className="topup-page__stat-label">Data guru tersedia</span>
                  <strong className="topup-page__stat-value">{guru.length}</strong>
               </div>
            </div>
         </div>

         <form onSubmit={handleTopup} className="admin-form topup-page__form">
            <div className="topup-page__grid">
               <div className="form-row topup-page__field">
                  <label>
                     Tipe Akun
                     <select
                        value={selectedType}
                        onChange={(e) => {
                           setSelectedType(e.target.value);
                           setSelectedSiswa("");
                           setSelectedGuru("");
                        }}
                        className="form-select"
                     >
                        <option value="siswa">Siswa</option>
                        <option value="guru">Guru</option>
                     </select>
                  </label>
               </div>

               <div className="form-row topup-page__field">
                  <label>
                     Metode Pembayaran
                     <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="form-select"
                     >
                        <option value="Tunai">Tunai</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Lainnya">Lainnya</option>
                     </select>
                  </label>
               </div>
            </div>

            <div className="form-row topup-page__field">
               <label>
                  Pilih {selectedType === "siswa" ? "Siswa" : "Guru"}
                  <Select
                     value={selectedOption || null}
                     onChange={(option) => {
                        if (selectedType === "siswa") {
                           setSelectedSiswa(option?.value || "");
                        } else {
                           setSelectedGuru(option?.value || "");
                        }
                     }}
                     options={selectedType === "siswa" ? siswaOptions : guruOptions}
                     placeholder={`Cari dan pilih ${selectedType === "siswa" ? "siswa" : "guru"}...`}
                     isClearable
                     className="react-select-container"
                     classNamePrefix="react-select"
                     noOptionsMessage={() => `Tidak ada ${selectedType === "siswa" ? "siswa" : "guru"} ditemukan`}
                  />
               </label>
            </div>

            {selectedAccount ? (
               <div className="topup-page__preview" role="status" aria-live="polite">
                  <span className="topup-page__preview-label">Saldo saat ini</span>
                  <strong className="topup-page__preview-value">Rp {Number(selectedAccount.saldo ?? 0).toLocaleString("id-ID")}</strong>
               </div>
            ) : null}

            <div className="topup-page__grid">
               <div className="form-row topup-page__field">
                  <label>
                     Jumlah Top-Up
                     <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Masukkan jumlah"
                     />
                  </label>
               </div>

               <div className="form-row topup-page__field">
                  <label>
                     Keterangan untuk riwayat
                     <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Contoh: top-up awal, pembayaran tunai, transfer bank"
                     />
                  </label>
               </div>
            </div>

            <p className="hint-text topup-page__hint-full">Catatan ini akan muncul di riwayat saldo pengguna agar lebih mudah dipahami.</p>

            <button type="submit" className="btn btn--primary topup-page__submit" disabled={loading}>
               {loading ? "Memproses..." : "Top-Up Saldo"}
            </button>
         </form>
      </div>
   );
}
