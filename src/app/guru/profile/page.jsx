"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./settings.css";

const supabase = createClient();

export default function GuruProfilePage() {
   const [teacher, setTeacher] = useState(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
   });
   const [message, setMessage] = useState({ type: "", text: "" });

   async function fetchTeacher() {
      setLoading(true);
      try {
         const session = getAuthSession();
         const nipSession = session?.role === "guru" ? session.nip : null;

         if (!nipSession) {
            setTeacher(null);
            return;
         }

         const { data, error } = await supabase
            .from("guru")
            .select("nip,nama_guru,bidang_studi,saldo,total_hutang,password")
            .eq("nip", nipSession)
            .maybeSingle();

         if (error) throw error;
         setTeacher(data ?? null);
      } catch (error) {
         console.error(error);
         setTeacher(null);
      } finally {
         setLoading(false);
      }
   }

   useEffect(() => {
      const load = async () => {
         await fetchTeacher();
      };

      void load();
   }, []);

   function handleInputChange(event) {
      const { name, value } = event.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (message.text) {
         setMessage({ type: "", text: "" });
      }
   }

   async function handleSubmit(event) {
      event.preventDefault();

      if (!teacher) {
         setMessage({ type: "error", text: "Data guru tidak tersedia." });
         return;
      }

      const { currentPassword, newPassword, confirmPassword } = formData;

      if (!currentPassword || !newPassword || !confirmPassword) {
         setMessage({ type: "error", text: "Semua kolom wajib diisi." });
         return;
      }

      if (String(teacher.password) !== String(currentPassword)) {
         setMessage({ type: "error", text: "Password lama tidak sesuai." });
         return;
      }

      if (newPassword.length < 6) {
         setMessage({ type: "error", text: "Password baru minimal 6 karakter." });
         return;
      }

      if (newPassword !== confirmPassword) {
         setMessage({ type: "error", text: "Konfirmasi password tidak cocok." });
         return;
      }

      setSaving(true);
      try {
         const { error } = await supabase
            .from("guru")
            .update({ password: newPassword })
            .eq("nip", teacher.nip);

         if (error) throw error;

         setMessage({ type: "success", text: "Password berhasil diperbarui." });
         setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
         setTeacher((prev) => (prev ? { ...prev, password: newPassword } : prev));
      } catch (error) {
         console.error(error);
         setMessage({ type: "error", text: "Gagal mengubah password." });
      } finally {
         setSaving(false);
      }
   }

   return (
      <div className="profile-page">
         <div className="profile-page__header">
            <h1>Profil</h1>
            <p>Informasi akun guru dan fitur perubahan password.</p>
         </div>

         <div className="profile-grid">
            <section className="profile-card">
               <h2>Data Guru</h2>
               {loading ? (
                  <Loading message="Memuat data guru..." size="small" />
               ) : !teacher ? (
                  <div className="profile-card__empty">Data guru tidak tersedia.</div>
               ) : (
                  <div className="profile-info">
                     <div className="profile-info__row">
                        <span className="profile-info__label">Nama</span>
                        <span>{teacher.nama_guru}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">NIP</span>
                        <span>{teacher.nip}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">Bidang Studi</span>
                        <span>{teacher.bidang_studi}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">Saldo</span>
                        <span>Rp {Number(teacher.saldo ?? 0).toLocaleString()}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">Total Hutang</span>
                        <span>Rp {Number(teacher.total_hutang ?? 0).toLocaleString()}</span>
                     </div>
                  </div>
               )}
            </section>

            <section className="profile-card">
               <h2>Ubah Password</h2>
               <form className="profile-form" onSubmit={handleSubmit}>
                  {message.text && (
                     <div className={`form-message form-message--${message.type}`}>
                        {message.text}
                     </div>
                  )}

                  <div>
                     <label className="profile-form__label" htmlFor="currentPassword">
                        Password Lama
                     </label>
                     <input
                        id="currentPassword"
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Masukkan password lama"
                        required
                     />
                  </div>

                  <div>
                     <label className="profile-form__label" htmlFor="newPassword">
                        Password Baru
                     </label>
                     <input
                        id="newPassword"
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Masukkan password baru (minimal 6 karakter)"
                        required
                     />
                  </div>

                  <div>
                     <label className="profile-form__label" htmlFor="confirmPassword">
                        Konfirmasi Password Baru
                     </label>
                     <input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Ketik ulang password baru"
                        required
                     />
                  </div>

                  <button type="submit" disabled={saving} className="btn btn--primary">
                     {saving ? "Menyimpan..." : "Perbarui Password"}
                  </button>
               </form>
            </section>
         </div>
      </div>
   );
}
