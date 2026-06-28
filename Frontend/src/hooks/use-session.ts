"use client";

import { useCurrentUser, type AuthUser } from "@/hooks/use-auth";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@clerk/nextjs";

function subscribeToClientReady() {
  return () => {};
}

export function useAuthSession() {
  const { user, logout } = useCurrentUser();
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useAuth();
  const mounted = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );

  const status = useMemo(() => {
    if (!mounted) return "loading" as const;
    if (!isClerkLoaded) return "loading" as const;
    if (user) return "authenticated" as const;
    
    if (isClerkSignedIn) return "loading" as const;
    
    if (typeof window !== "undefined" && localStorage.getItem("access_token"))
      return "loading" as const;
      
    return "unauthenticated" as const;
  }, [mounted, user, isClerkLoaded, isClerkSignedIn]);

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
