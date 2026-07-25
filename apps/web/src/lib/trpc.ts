import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@bulk-messanger/trpc';

export const trpc = createTRPCReact<AppRouter>();
