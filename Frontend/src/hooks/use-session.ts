"use client";

import { useCurrentUser, type AuthUser } from "@/hooks/use-auth";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useAuthSession() {
  const { user, logout } = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const status = useMemo(() => {
    if (!mounted) return "loading" as const;
    if (user) return "authenticated" as const;
    if (typeof window !== "undefined" && localStorage.getItem("access_token")) return "loading" as const;
    return "unauthenticated" as const;
  }, [mounted, user]);

  const signOut = useCallback(() => {
    logout();
  }, [logout]);

  return {
    session: mounted && user ? { user } : null,
    status,
    signOut,
  };
}

export type { AuthUser as Session };
