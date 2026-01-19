import { initTRPC, TRPCError } from '@trpc/server';
import { getAuth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

interface Context {
  userId?: string;
  auth?: ReturnType<typeof getAuth>;
}

export async function createContext(): Promise<Context> {
  const headersList = await headers();
  const auth = getAuth({ headers: headersList } as any);
  return {
    userId: auth.userId,
    auth,
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in to perform this action',
    });
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      userId: opts.ctx.userId,
    },
  });
});
