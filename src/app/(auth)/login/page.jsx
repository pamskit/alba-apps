"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/utils/auth";

const supabase = createClient();

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

      const normalizedIdentifier = String(identifier).trim();

      if (normalizedIdentifier.toLowerCase() === "admin") {
         if (password !== "password123") {
            alert("Username atau password admin salah.");
            setLoading(false);
            return;
         }

         saveAuthSession({ role: "admin", username: "admin" });
         router.replace("/admin");
         return;
      }

      // Check if it's a guru login (NIP format: 4 digits starting with 2)
      if (/^\d{4}$/.test(normalizedIdentifier) && normalizedIdentifier.startsWith("2")) {
         try {
            const { data, error } = await supabase
               .from("guru")
               .select("nip,nama_guru,bidang_studi,password")
               .eq("nip", Number(normalizedIdentifier))
               .maybeSingle();

            if (error) {
               throw error;
            }

            if (!data) {
               alert("NIP guru tidak ditemukan.");
               setLoading(false);
               return;
            }

            if (String(data.password) !== String(password)) {
               alert("Password salah.");
               setLoading(false);
               return;
            }

            saveAuthSession({
               role: "guru",
               nip: data.nip,
               nama: data.nama_guru,
               bidang_studi: data.bidang_studi,
            });

            router.replace("/guru/dashboard");
            return;
         } catch (error) {
            console.error(error);
            alert("Gagal memeriksa akun guru.");
            setLoading(false);
            return;
         }
      }

      // Check if it's a siswa login (NIS format: 4 digits starting with 1)
      if (!/^\d+$/.test(normalizedIdentifier)) {
         alert("Masukkan NIS siswa atau NIP guru yang valid.");
         setLoading(false);
         return;
      }

      try {
         const { data, error } = await supabase
            .from("siswa")
            .select("nis,nama_siswa,kelas,password")
            .eq("nis", Number(normalizedIdentifier))
            .maybeSingle();

         if (error) {
            throw error;
         }

         if (!data) {
            alert("NIS tidak ditemukan.");
            setLoading(false);
            return;
         }

         if (String(data.password) !== String(password)) {
            alert("Password salah.");
            setLoading(false);
            return;
         }

         saveAuthSession({
            role: "siswa",
            nis: data.nis,
            nama: data.nama_siswa,
            kelas: data.kelas,
         });

         router.replace("/dashboard");
      } catch (error) {
         console.error(error);
         alert("Gagal memeriksa akun siswa.");
      } finally {
         setLoading(false);
      }
   }

   return (
      <main className="auth-page">
         <section className="auth-card">
            <h1>Masuk ke Koperasi</h1>
            <p>Masukkan username admin, NIS siswa, atau NIP guru untuk masuk ke sistem.</p>

            <form onSubmit={handleSubmit} className="auth-form">
               <label>
                  Username / NIS / NIP
                  <input
                     value={identifier}
                     onChange={(e) => setIdentifier(e.target.value)}
                     placeholder="admin, 1001 (siswa), atau 2001 (guru)"
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
