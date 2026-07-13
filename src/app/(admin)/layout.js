"use client";

import AdminSidebar from "./AdminSidebar";
import Loading from "@/components/Loading";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function AdminLayout({ children }) {
  const { loading, handleLogout } = useRequireAuth("admin");

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

