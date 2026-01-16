import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/lib/trpc/appRouter';

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
});
