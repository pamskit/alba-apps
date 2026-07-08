"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import AdminSidebar from "./AdminSidebar";
import Loading from "@/components/Loading";

export default function AdminLayout({ children }) {
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

    if (authSession.role === "admin") {
      return;
    }

    if (authSession.role === "siswa") {
      router.replace("/dashboard");
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [router]);

  if (!session || session.role !== "admin") {
    return <Loading message="Memeriksa otentikasi admin..." size="large" />;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-layout__content">
        <header className="app-header">
          <div className="app-header__title">Admin / Kasir</div>
          <button type="button" className="btn btn--danger" onClick={handleLogout}>
            Keluar
          </button>
        </header>
        <main className="admin-layout__main">{children}</main>
      </div>
    </div>
  );
} 

