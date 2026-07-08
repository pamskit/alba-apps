"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import SiswaSidebar from "./SiswaSidebar";
import Loading from "@/components/Loading";

export default function SiswaLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    } finally {
      clearAuthSession();
      router.replace("/");
    }
  }

  useEffect(() => {
    const session = getAuthSession();

    if (!session) {
      clearAuthSession();
      router.replace("/");
      return;
    }

    if (session.role === "siswa") {
      setLoading(false);
      return;
    }

    if (session.role === "admin") {
      router.replace("/kasir");
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [router]);

  if (loading) {
    return <Loading message="Memeriksa otentikasi siswa..." size="large" />;
  }

  return (
    <div className="admin-layout">
      <SiswaSidebar />
      <div className="admin-layout__content">
        <header className="app-header">
          <div className="app-header__title">Portal Siswa</div>
          <button type="button" className="btn btn--danger" onClick={handleLogout}>
            Keluar
          </button>
        </header>
        <main className="admin-layout__main">{children}</main>
      </div>
    </div>
  );
} 
