"use client";

import GuruSidebar from "./GuruSidebar";
import Loading from "@/components/Loading";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function GuruLayout({ children }) {
  const { loading, handleLogout } = useRequireAuth("guru");

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
