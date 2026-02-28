import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 20_000,
      gcTime: 5 * 60_000,
    },
  },
});

