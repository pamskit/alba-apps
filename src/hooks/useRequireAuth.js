"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, getAuthSession, getRedirectRouteByRole } from "@/utils/auth";

export function useRequireAuth(requiredRole) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

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

    if (session.role !== requiredRole) {
      const redirectPath = getRedirectRouteByRole(session.role);
      if (redirectPath) {
        router.replace(redirectPath);
        return;
      }

      clearAuthSession();
      router.replace("/");
      return;
    }

    // Auth is confirmed on the client. We intentionally set mounted state here
    // so the initial server render stays consistent and avoids hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [requiredRole, router]);

  return { loading: !checked, handleLogout };
}
