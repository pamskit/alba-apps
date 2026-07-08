"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import GuruSidebar from "./GuruSidebar";
import Loading from "@/components/Loading";

export default function GuruLayout({ children }) {
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

    if (session.role === "guru") {
      setLoading(false);
      return;
    }

    if (session.role === "admin") {
      router.replace("/admin");
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
