"use client";

import Loading from "@/components/Loading";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import "./pengurus.css";

export default function PengurusLayout({ children }) {
  const { loading, handleLogout } = useRequireAuth("pengurus");

  if (loading) {
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
