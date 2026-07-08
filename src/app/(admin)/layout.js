"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import AdminSidebar from "./AdminSidebar";
import Loading from "@/components/Loading";

export default function AdminLayout({ children }) {
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

    if (session.role === "admin") {
      setLoading(false);
      return;
    }

    if (session.role === "siswa") {
      router.replace("/dashboard");
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [router]);

  if (loading) {
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

