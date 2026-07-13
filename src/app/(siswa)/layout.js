"use client";

import SiswaSidebar from "./SiswaSidebar";
import Loading from "@/components/Loading";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function SiswaLayout({ children }) {
  const { loading, handleLogout } = useRequireAuth("siswa");

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
