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

      // If identifier is numeric, try guru first, then siswa.
      if (!/^\d+$/.test(normalizedIdentifier)) {
         alert("Masukkan NIS siswa atau NIP guru yang valid.");
         setLoading(false);
         return;
      }

      const numericId = Number(normalizedIdentifier);

      // Try guru lookup first (covers variable-length NIP like 22222)
      try {
         const { data: guruData, error: guruError } = await supabase
            .from("guru")
            .select("nip,nama_guru,bidang_studi,password")
            .eq("nip", numericId)
            .maybeSingle();

         if (guruError) throw guruError;

         if (guruData) {
            if (String(guruData.password) !== String(password)) {
               alert("Password salah.");
               setLoading(false);
               return;
            }

            saveAuthSession({
               role: "guru",
               nip: guruData.nip,
               nama: guruData.nama_guru,
               bidang_studi: guruData.bidang_studi,
            });

            router.replace("/guru/dashboard");
            return;
         }
      } catch (error) {
         console.error(error);
         alert("Gagal memeriksa akun guru.");
         setLoading(false);
         return;
      }

      // If not a guru, try siswa
      try {
         const { data: siswaData, error: siswaError } = await supabase
            .from("siswa")
            .select("nis,nama_siswa,kelas,password")
            .eq("nis", numericId)
            .maybeSingle();

         if (siswaError) throw siswaError;

         if (!siswaData) {
            alert("NIS tidak ditemukan.");
            setLoading(false);
            return;
         }

         if (String(siswaData.password) !== String(password)) {
            alert("Password salah.");
            setLoading(false);
            return;
         }

         saveAuthSession({
            role: "siswa",
            nis: siswaData.nis,
            nama: siswaData.nama_siswa,
            kelas: siswaData.kelas,
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
