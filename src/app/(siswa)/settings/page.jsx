"use client";

import { useStudentProfile } from "@/hooks/useStudentProfile";
import Loading from "@/components/Loading";
import ProfileInfoCard from "@/components/ProfileInfoCard";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import "./settings.css";

export default function SettingsPage() {
   const { student, loading } = useStudentProfile();

   const saldoText = student ? `Rp ${Number(student.saldo ?? 0).toLocaleString("id-ID")}` : "-";
   const hutangText = student ? `Rp ${Number(student.total_hutang ?? 0).toLocaleString("id-ID")}` : "-";

   async function handlePasswordChange(values) {
      const response = await fetch("/api/auth/change-password", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(values),
      });

      return response.json();
   }

   const profileFields = student
      ? [
         { label: "Nama", value: student.nama_siswa },
         { label: "NIS", value: student.nis },
         { label: "Kelas", value: student.kelas },
         { label: "Saldo", value: `Rp ${Number(student.saldo ?? 0).toLocaleString("id-ID")}` },
         { label: "Total Hutang", value: `Rp ${Number(student.total_hutang ?? 0).toLocaleString("id-ID")}` },
      ]
      : [];

   return (
      <div className="profile-page">
         <div className="profile-page__header">
            <h1>Profil</h1>
            <p>Informasi akun siswa dan fitur perubahan password.</p>

            <div className="profile-page__stats" aria-label="Ringkasan akun siswa">
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
               title="Data Siswa"
               fields={profileFields}
               loading={loading}
               emptyMessage="Data siswa tidak tersedia."
            />
            <section className="profile-card">
               <PasswordChangeForm onSubmit={handlePasswordChange} title="Keamanan Akun" submitLabel="Simpan Password" />
            </section>
         </div>
      </div>
   );
}
