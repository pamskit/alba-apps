"use client";

import { useState } from "react";

export default function PasswordChangeForm({ onSubmit, title = "Ubah Password", submitLabel = "Simpan Password" }) {
   const [formData, setFormData] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
   });
   const [saving, setSaving] = useState(false);
   const [message, setMessage] = useState({ type: "", text: "" });

   function handleInputChange(event) {
      const { name, value } = event.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (message.text) {
         setMessage({ type: "", text: "" });
      }
   }

   async function handleSubmit(event) {
      event.preventDefault();
      setSaving(true);

      try {
         const result = await onSubmit({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
         });

         if (result && result.success === false) {
            throw new Error(result.error || "Gagal mengubah password.");
         }

         setMessage({ type: "success", text: result?.message || "Password berhasil diperbarui." });
         setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (error) {
         setMessage({ type: "error", text: error?.message || "Gagal mengubah password." });
      } finally {
         setSaving(false);
      }
   }

   return (
      <form className="profile-form" onSubmit={handleSubmit}>
         <h2>{title}</h2>
         <div>
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
               required
            />
         </div>

         <div>
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
               name="confirmPassword"
               type="password"
               className="profile-form__input"
               value={formData.confirmPassword}
               onChange={handleInputChange}
               placeholder="Ketik ulang password baru"
               required
            />
         </div>

         {message.text ? (
            <div className={`profile-form__message profile-form__message--${message.type}`}>
               {message.text}
            </div>
         ) : null}

         <button type="submit" className="profile-form__button" disabled={saving}>
            {saving ? "Menyimpan..." : submitLabel}
         </button>
      </form>
   );
}
