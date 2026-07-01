"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { setClerkTokenGetter } from "@/lib/api/client";

function ClerkTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded;

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      console.info("[auth] Clerk loaded without an active session");
      setClerkTokenGetter(null);
    } else {
      console.info("[auth] Clerk loaded with an active session");
      setClerkTokenGetter(() => getToken());
    }
  }, [getToken, isLoaded, isSignedIn]);

  if (!ready) {
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
