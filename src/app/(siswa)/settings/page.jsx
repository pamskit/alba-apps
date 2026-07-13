"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./settings.css";

const supabase = createClient();

export default function SettingsPage() {
   const [student, setStudent] = useState(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
   });
   const [message, setMessage] = useState({ type: "", text: "" });

   async function fetchStudent() {
      setLoading(true);
      try {
         const session = getRoleSession("siswa");
         const nisSession = session?.nis ?? null;

         if (!nisSession) {
            setStudent(null);
            return;
         }

         const { data, error } = await supabase
            .from("siswa")
            .select("nis,nama_siswa,kelas,saldo,total_hutang,password")
            .eq("nis", nisSession)
            .maybeSingle();

         if (error) throw error;
         setStudent(data ?? null);
      } catch (error) {
         console.error(error);
         setStudent(null);
      } finally {
         setLoading(false);
      }
   }

   useEffect(() => {
      async function loadStudent() {
         await fetchStudent();
      }

      void loadStudent();
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

      if (!student) {
         setMessage({ type: "error", text: "Data siswa tidak tersedia." });
         return;
      }

      const { currentPassword, newPassword, confirmPassword } = formData;

      if (!currentPassword || !newPassword || !confirmPassword) {
         setMessage({ type: "error", text: "Semua kolom wajib diisi." });
         return;
      }

      if (String(student.password) !== String(currentPassword)) {
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
         const { error } = await supabase.from("siswa").update({ password: newPassword }).eq("nis", student.nis);

         if (error) throw error;

         setMessage({ type: "success", text: "Password berhasil diperbarui." });
         setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
         setStudent((prev) => (prev ? { ...prev, password: newPassword } : prev));
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
            <p>Informasi akun siswa dan fitur perubahan password.</p>
         </div>

         <div className="profile-grid">
            <section className="profile-card">
               <h2>Data Siswa</h2>
               {loading ? (
                  <Loading message="Memuat data siswa..." size="small" />
               ) : !student ? (
                  <div className="profile-card__empty">Data siswa tidak tersedia.</div>
               ) : (
                  <div className="profile-info">
                     <div className="profile-info__row">
                        <span className="profile-info__label">Nama</span>
                        <span>{student.nama_siswa}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">NIS</span>
                        <span>{student.nis}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">Kelas</span>
                        <span>{student.kelas}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">Saldo</span>
                        <span>Rp {Number(student.saldo ?? 0).toLocaleString()}</span>
                     </div>
                     <div className="profile-info__row">
                        <span className="profile-info__label">Total Hutang</span>
                        <span>Rp {Number(student.total_hutang ?? 0).toLocaleString()}</span>
                     </div>
                  </div>
               )}
            </section>

            <section className="profile-card">
               <h2>Ubah Password</h2>
               <form className="profile-form" onSubmit={handleSubmit}>
                  <label className="profile-form__label" htmlFor="currentPassword">
                     Password Lama
                  </label>
                  <input
                     id="currentPassword"
                     name="currentPassword"
                     type="password"
                     className="profile-form__input"
                     value={formData.currentPassword}
                     onChange={handleInputChange}
                     placeholder="Masukkan password lama"
                  />

                  <label className="profile-form__label" htmlFor="newPassword">
                     Password Baru
                  </label>
                  <input
                     id="newPassword"
                     name="newPassword"
                     type="password"
                     className="profile-form__input"
                     value={formData.newPassword}
                     onChange={handleInputChange}
                     placeholder="Minimal 6 karakter"
                  />

                  <label className="profile-form__label" htmlFor="confirmPassword">
                     Konfirmasi Password Baru
                  </label>
                  <input
                     id="confirmPassword"
                     name="confirmPassword"
                     type="password"
                     className="profile-form__input"
                     value={formData.confirmPassword}
                     onChange={handleInputChange}
                     placeholder="Ulangi password baru"
                  />

                  {message.text ? <div className={`profile-form__message profile-form__message--${message.type}`}>{message.text}</div> : null}

                  <button type="submit" className="profile-form__button" disabled={saving}>
                     {saving ? "Menyimpan..." : "Simpan Password"}
                  </button>
               </form>
            </section>
         </div>
      </div>
   );
}
