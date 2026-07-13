"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, getAuthSession, getRedirectRouteByRole } from "@/utils/auth";

export function useRequireAuth(requiredRole) {
  const router = useRouter();
  const [loading, setLoading] = useState(() => {
    const session = getAuthSession();
    return !(session && session.role === requiredRole);
  });

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    } finally {
      clearAuthSession();
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    const session = getAuthSession();

    if (!session) {
      clearAuthSession();
      router.replace("/");
      return;
    }

    if (session.role === requiredRole) {
      return;
    }

    const redirectPath = getRedirectRouteByRole(session.role);
    if (redirectPath) {
      router.replace(redirectPath);
      return;
    }

    clearAuthSession();
    router.replace("/");
  }, [requiredRole, router]);

  return { loading, handleLogout };
}
