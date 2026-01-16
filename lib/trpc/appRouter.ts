import { router } from '@/lib/trpc/init';
import { routeRouter } from '@/lib/trpc/routes';

export const appRouter = router({
  routes: routeRouter,
});

export type AppRouter = typeof appRouter;
