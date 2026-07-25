import '../../../../lib/env';
import { auth } from '@bulk-messanger/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { withCors } from '../../../../lib/cors';

const { GET: authGet, POST: authPost } = toNextJsHandler(auth.handler);

export const GET = withCors(authGet);
export const POST = withCors(authPost);
export const OPTIONS = withCors(
  async () => new Response(null, { status: 204 }),
);
