"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, clearAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./pengurus.css";

export default function PengurusLayout({ children }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isPengurus, setIsPengurus] = useState(false);

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

    if (session.role === "pengurus") {
      setIsPengurus(true);
      setIsReady(true);
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

    if (session.role === "guru") {
      router.replace("/guru/dashboard");
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [router]);

  if (!isReady) {
    return <Loading message="Memeriksa otentikasi pengurus..." size="large" />;
  }

  return (
    <div className="admin-layout admin-layout--solo">
      <div className="admin-layout__content">
        <header className="app-header">
          <div className="app-header__title">Pengurus / Laporan</div>
          <button type="button" className="btn btn--danger" onClick={handleLogout}>
            Keluar
          </button>
        </header>
        <main className="admin-layout__main">{children}</main>
      </div>
    </div>
  );
}
