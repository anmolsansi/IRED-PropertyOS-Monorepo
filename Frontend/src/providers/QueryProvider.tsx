"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            Sentry.captureException(error, {
              tags: { context: "ReactQuery_Query" },
            });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            Sentry.captureException(error, {
              tags: { context: "ReactQuery_Mutation" },
            });
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
