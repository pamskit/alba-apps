"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

const navItems = [
   { href: "/dashboard", label: "Dashboard" },
   { href: "/beli-produk", label: "Beli Produk" },
   { href: "/saldo", label: "Saldo" },
   { href: "/hutang-saya", label: "Hutang Saya" },
   { href: "/settings", label: "Settings" },
];

export default function SiswaSidebar() {
   const pathname = usePathname() || "";
   const currentPath = useMemo(
      () => pathname.split(/[?#]/)[0].replace(/\/$/, "") || "/",
      [pathname]
   );

   return (
      <aside className="sidebar admin-sidebar">
         <div className="sidebar__logo admin-sidebar__brand">Alba Apps</div>
         <nav className="sidebar__menu admin-sidebar__nav">
            {navItems.map((item) => {
               const itemPath = item.href.replace(/\/$/, "") || "/";
               const isActive = currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
               return (
                  <Link
                     key={item.href}
                     href={item.href}
                     className={`sidebar__link admin-sidebar__link${isActive ? " sidebar__link--active admin-sidebar__link--active" : ""}`}
                     aria-current={isActive ? "page" : undefined}
                  >
                     {item.label}
                  </Link>
               );
            })}
         </nav>
      </aside>
   );
}
