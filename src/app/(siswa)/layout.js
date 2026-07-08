"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import SiswaSidebar from "./SiswaSidebar";
import Loading from "@/components/Loading";

export default function SiswaLayout({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);

  function handleLogout() {
    clearAuthSession();
    router.replace("/");
  }

  useEffect(() => {
    const authSession = getAuthSession();
    setSession(authSession);

    if (!authSession) {
      clearAuthSession();
      router.replace("/");
      return;
    }

    if (authSession.role === "siswa") {
      return;
    }

    if (authSession.role === "admin") {
      router.replace("/kasir");
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [router]);

  if (!session || session.role !== "siswa") {
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
