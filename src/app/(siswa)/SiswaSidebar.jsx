"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
   { href: "/dashboard", label: "Dashboard" },
   { href: "/saldo", label: "Saldo" },
   { href: "/hutang-saya", label: "Hutang Saya" },
   { href: "/settings", label: "Settings" },
];

export default function SiswaSidebar() {
   const pathname = usePathname() || "";
   const normalizedPath = useMemo(
      () => pathname.split(/[?#]/)[0].replace(/\/$/, "") || "/",
      [pathname]
   );
   const [currentPath, setCurrentPath] = useState(normalizedPath);

   useEffect(() => {
      setCurrentPath(normalizedPath);
   }, [normalizedPath]);

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
