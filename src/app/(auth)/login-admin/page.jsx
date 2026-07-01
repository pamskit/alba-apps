"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/utils/auth";

export default function LoginAdminPage() {
   const router = useRouter();
   const [username, setUsername] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const session = getAuthSession();
      if (!session) return;

      if (session.role === "admin") {
         router.replace("/admin");
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

      if (username !== "admin" || password !== "password123") {
         alert("Username atau password admin salah.");
         setLoading(false);
         return;
      }

      saveAuthSession({ role: "admin", username: "admin" });
      router.replace("/kasir");
   }

   return (
      <main className="auth-page">
         <section className="auth-card">
            <h1>Login Admin</h1>
            <p>Masuk untuk mengakses kasir, hutang, dan laporan admin.</p>
            <form onSubmit={handleSubmit} className="auth-form">
               <label>
                  Username
                  <input value={username} onChange={(e) => setUsername(e.target.value)} required />
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
