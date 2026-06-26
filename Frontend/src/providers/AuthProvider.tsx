"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { setClerkTokenGetter } from "@/lib/api/client";

function ClerkTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isTokenSourceReady, setIsTokenSourceReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setClerkTokenGetter(null);
      setIsTokenSourceReady(true);
      return;
    }

    setClerkTokenGetter(() => getToken());
    setIsTokenSourceReady(true);
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || !isTokenSourceReady) {
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
