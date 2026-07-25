import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import {
  appRouter,
  createTRPCContext,
} from '@bulk-messanger/trpc/server';
import { withCors } from '../../../../lib/cors';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export const GET = withCors((req) => handler(req));
export const POST = withCors((req) => handler(req));
export const OPTIONS = withCors(
  async () => new Response(null, { status: 204 }),
);
