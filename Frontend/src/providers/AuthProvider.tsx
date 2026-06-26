"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { setClerkTokenGetter } from "@/lib/api/client";

function ClerkTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isTokenBridgeReady, setIsTokenBridgeReady] = useState(false);

  useEffect(() => {
    setIsTokenBridgeReady(false);

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      console.info("[auth] Clerk loaded without an active session");
      setClerkTokenGetter(null);
      setIsTokenBridgeReady(true);
      return;
    }

    console.info("[auth] Clerk loaded with an active session");
    setClerkTokenGetter(() => getToken());
    setIsTokenBridgeReady(true);
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || !isTokenBridgeReady) {
    return null;
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ClerkTokenBridge>{children}</ClerkTokenBridge>
    </ClerkProvider>
  );
}
