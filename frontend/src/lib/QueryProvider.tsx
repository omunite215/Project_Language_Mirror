"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetching
            gcTime: 10 * 60 * 1000, // 10 minutes cache
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Prevent duplicate fetches
            refetchOnReconnect: false,
            retry: 1, // Only 1 retry
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
