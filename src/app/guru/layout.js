"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import GuruSidebar from "./GuruSidebar";
import Loading from "@/components/Loading";

export default function GuruLayout({ children }) {
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

    if (authSession.role === "guru") {
      return;
    }

    if (authSession.role === "admin") {
      router.replace("/admin");
      return;
    }

    if (authSession.role === "siswa") {
      router.replace("/dashboard");
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [router]);

  if (!session || session.role !== "guru") {
    return <Loading message="Memeriksa otentikasi guru..." size="large" />;
  }

  return (
    <div className="admin-layout">
      <GuruSidebar />
      <div className="admin-layout__content">
        <header className="app-header">
          <div className="app-header__title">Portal Guru</div>
          <button type="button" onClick={handleLogout} className="btn btn--danger">
            Keluar
          </button>
        </header>
        <main className="admin-layout__main">{children}</main>
      </div>
    </div>
  );
}
