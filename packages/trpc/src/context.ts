import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@bulk-messanger/auth';

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return {
    session,
    headers: opts.req.headers,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
