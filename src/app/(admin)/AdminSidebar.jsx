"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
   { href: "/admin", label: "Dashboard" },
   { href: "/kasir", label: "Kasir" },
   { href: "/hutang", label: "Hutang" },
   { href: "/laporan", label: "Laporan" },
   { href: "/produk", label: "Produk" },
   { href: "/siswa", label: "Siswa" },
];

export default function AdminSidebar() {
   const pathname = usePathname();
   const normalizedPath = pathname?.replace(/\/$/, "") || "/";

   return (
      <aside className="admin-sidebar">
         <div className="admin-sidebar__brand">Alba Apps</div>
         <nav className="admin-sidebar__nav">
            {navItems.map((item) => {
               const isActive =
                  normalizedPath === item.href ||
                  (item.href === "/admin" && normalizedPath === "/");
               return (
                  <Link
                     key={item.href}
                     href={item.href}
                     className={`admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`}
                  >
                     {item.label}
                  </Link>
               );
            })}
         </nav>
      </aside>
   );
}
