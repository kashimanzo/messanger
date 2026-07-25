import { createAppAuthClient } from '@bulk-messanger/auth/client';
import { clientEnv } from '@bulk-messanger/env/client';

export const authClient = createAppAuthClient(clientEnv.VITE_API_URL);
