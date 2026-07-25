import { createAuthClient } from 'better-auth/react';
import { getApiBaseUrl } from './api-url';
import { clearAuthToken, getAuthToken, setAuthToken } from './auth-token';

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
  fetchOptions: {
    credentials: 'include',
    auth: {
      type: 'Bearer',
      token: () => getAuthToken() || '',
    },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get('set-auth-token');
      if (token) {
        setAuthToken(token);
      }
    },
  },
});

export function clearMobileAuthSession() {
  clearAuthToken();
}
