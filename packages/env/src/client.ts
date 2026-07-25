import { z } from 'zod';

const clientEnvSchema = z.object({
  VITE_API_URL: z.string().url(),
});

function getClientEnv() {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };

  return clientEnvSchema.parse({
    VITE_API_URL: meta.env?.VITE_API_URL ?? 'http://localhost:3000',
  });
}

export const clientEnv = getClientEnv();
