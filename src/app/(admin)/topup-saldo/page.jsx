"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import { createClient } from "@/utils/supabase";

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

   async function handleTopup(event) {
      event.preventDefault();
      const amountValue = Number(amount);

      if (!amountValue || amountValue <= 0) return alert("Jumlah top-up harus lebih besar dari 0.");

      const isSiswa = selectedType === "siswa";
      const selectedId = isSiswa ? selectedSiswa : selectedGuru;
      if (!selectedId) return alert(`Pilih ${isSiswa ? "siswa" : "guru"} terlebih dahulu.`);

      setLoading(true);
      try {
         if (isSiswa) {
            const student = siswa.find((item) => String(item.nis) === String(selectedId));
            if (!student) return alert("Siswa tidak ditemukan.");

            const newSaldo = Number(student.saldo ?? 0) + amountValue;
            const { error: updateError } = await supabase.from("siswa").update({ saldo: newSaldo }).eq("nis", selectedId);
            if (updateError) throw updateError;

            const { error: insertError } = await supabase.from("topup_saldo").insert({
               nis_siswa: selectedId,
               jumlah: amountValue,
               metode: method,
               keterangan: note || null,
            });
            if (insertError) throw insertError;
         } else {
            const teacher = guru.find((item) => String(item.nip) === String(selectedId));
            if (!teacher) return alert("Guru tidak ditemukan.");

            const newSaldo = Number(teacher.saldo ?? 0) + amountValue;
            const { error: updateError } = await supabase.from("guru").update({ saldo: newSaldo }).eq("nip", selectedId);
            if (updateError) throw updateError;

            const { error: insertError } = await supabase.from("topup_saldo_guru").insert({
               nip_guru: selectedId,
               jumlah: amountValue,
               metode: method,
               keterangan: note || null,
            });
            if (insertError) throw insertError;
         }

         alert("Top-up saldo berhasil.");
         setAmount("");
         setNote("");
         setSelectedSiswa("");
         setSelectedGuru("");
         await Promise.all([fetchSiswa(), fetchGuru()]);
      } catch (error) {
         console.error(error);
         alert("Gagal melakukan top-up saldo.");
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="page-content">
         <div className="page-header">
            <h1>Top-Up Saldo</h1>
            <p>Tambahkan saldo siswa atau guru tanpa mencampur dengan transaksi kasir.</p>
         </div>

         <form onSubmit={handleTopup} className="admin-form">
            <div className="form-row">
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

            <div className="form-row">
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

            <div className="form-row">
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

            <div className="form-row">
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

            <div className="form-row">
               <label>
                  Keterangan untuk riwayat
                  <input
                     type="text"
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     placeholder="Contoh: top-up awal, pembayaran tunai, transfer bank"
                  />
               </label>
               <p className="hint-text">Catatan ini akan muncul di riwayat saldo pengguna agar lebih mudah dipahami.</p>
            </div>

            <button type="submit" className="btn btn--primary" disabled={loading}>
               {loading ? "Memproses..." : "Top-Up Saldo"}
            </button>
         </form>
      </div>
   );
}
