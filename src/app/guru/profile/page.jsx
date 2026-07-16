"use client";

import { useTeacherProfile } from "@/hooks/useTeacherProfile";
import Loading from "@/components/Loading";
import ProfileInfoCard from "@/components/ProfileInfoCard";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import "./settings.css";

export default function GuruProfilePage() {
   const { teacher, loading } = useTeacherProfile();

   const saldoText = teacher ? `Rp ${Number(teacher.saldo ?? 0).toLocaleString("id-ID")}` : "-";
   const hutangText = teacher ? `Rp ${Number(teacher.total_hutang ?? 0).toLocaleString("id-ID")}` : "-";

   async function handlePasswordChange(values) {
      const response = await fetch("/api/auth/change-password", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(values),
      });

      return response.json();
   }

   const profileFields = teacher
      ? [
         { label: "Nama", value: teacher.nama_guru },
         { label: "NIP", value: teacher.nip },
         { label: "Bidang Studi", value: teacher.bidang_studi },
         { label: "Saldo", value: `Rp ${Number(teacher.saldo ?? 0).toLocaleString()}` },
         { label: "Total Hutang", value: `Rp ${Number(teacher.total_hutang ?? 0).toLocaleString()}` },
      ]
      : [];

   return (
      <div className="profile-page">
         <div className="profile-page__header">
            <h1>Profil</h1>
            <p>Informasi akun guru dan fitur perubahan password.</p>

            <div className="profile-page__stats" aria-label="Ringkasan akun guru">
               <div className="profile-page__stat-card">
                  <span className="profile-page__stat-label">Saldo</span>
                  <strong className="profile-page__stat-value">{loading ? "Memuat..." : saldoText}</strong>
               </div>
               <div className="profile-page__stat-card">
                  <span className="profile-page__stat-label">Total Hutang</span>
                  <strong className="profile-page__stat-value">{loading ? "Memuat..." : hutangText}</strong>
               </div>
            </div>
         </div>

         <div className="profile-grid">
            <ProfileInfoCard
               title="Data Guru"
               fields={profileFields}
               loading={loading}
               emptyMessage="Data guru tidak tersedia."
            />
            <section className="profile-card">
               <PasswordChangeForm onSubmit={handlePasswordChange} title="Keamanan Akun" submitLabel="Perbarui Password" />
            </section>
         </div>
      </div>
   );
}
