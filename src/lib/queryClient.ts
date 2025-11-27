import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Data is fresh for 1 minute
      gcTime: 1000 * 60 * 10, // Cache persists for 10 minutes
      retry: 1,
      refetchOnWindowFocus: true, // Auto-update when returning to tab
    },
  },
});