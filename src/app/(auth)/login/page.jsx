"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/utils/auth";

function UnifiedLoginContent() {
   const router = useRouter();
   const [identifier, setIdentifier] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const session = getAuthSession();
      if (!session) return;

      if (session.role === "admin") {
         router.replace("/admin");
         return;
      }

      if (session.role === "pengurus") {
         router.replace("/pengurus/laporan");
         return;
      }

      if (session.role === "guru") {
         router.replace("/guru/dashboard");
         return;
      }

      if (session.role === "siswa") {
         router.replace("/dashboard");
         return;
      }

      clearAuthSession();
   }, [router]);

   async function handleSubmit(event) {
      event.preventDefault();
      setLoading(true);

      try {
         const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
         });

         const result = await response.json();

         if (!response.ok) {
            throw new Error(result.error || "Gagal login");
         }

         saveAuthSession(result.session);

         if (result.session.role === "admin") {
            router.replace("/admin");
            return;
         }

         if (result.session.role === "pengurus") {
            router.replace("/pengurus/laporan");
            return;
         }

         if (result.session.role === "guru") {
            router.replace("/guru/dashboard");
            return;
         }

         if (result.session.role === "siswa") {
            router.replace("/dashboard");
            return;
         }

         alert("Role tidak diketahui.");
      } catch (error) {
         console.error(error);
         alert(error.message || "Terjadi kesalahan saat login.");
      } finally {
         setLoading(false);
      }
   }

   return (
      <main className="auth-page">
         <section className="auth-card">
            <h1>Masuk ke Koperasi</h1>
            <p>Masukkan username admin/pengurus, NIS siswa, atau NIP guru untuk masuk ke sistem.</p>
            <p className="auth-help-text">Untuk admin dan pengurus, password dapat diatur dari environment server agar lebih aman dan tidak tertulis di kode.</p>

            <form onSubmit={handleSubmit} className="auth-form">
               <label>
                  Username / NIS / NIP
                  <input
                     value={identifier}
                     onChange={(e) => setIdentifier(e.target.value)}
                     placeholder="admin, pengurus, 1001 (siswa), atau 2001 (guru)"
                     required
                  />
               </label>
               <label>
                  Password
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
               </label>
               <button type="submit" disabled={loading} className="btn btn--primary">
                  {loading ? "Memproses..." : "Masuk"}
               </button>
            </form>
         </section>
      </main>
   );
}

export default function UnifiedLoginPage() {
   return (
      <Suspense fallback={<main className="auth-page"><section className="auth-card"><p>Memuat form login...</p></section></main>}>
         <UnifiedLoginContent />
      </Suspense>
   );
}
