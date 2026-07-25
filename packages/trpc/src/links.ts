import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import superjson from 'superjson';

type TrpcLinkOptions = {
  getAuthToken?: () => string | null | undefined;
};

export function createTrpcLinks(apiBaseUrl: string, options?: TrpcLinkOptions) {
  const url = `${apiBaseUrl}/api/trpc`;

  const fetchWithCredentials: typeof fetch = (input, init) => {
    const method = init?.method ?? 'GET';
    const headers = new Headers(init?.headers);

    if (
      method !== 'GET' &&
      method !== 'HEAD' &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }

    const token = options?.getAuthToken?.();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      method,
      credentials: 'include',
      headers,
    });
  };

  return [
    splitLink({
      condition: (op) => op.type === 'mutation',
      true: httpLink({
        url,
        transformer: superjson,
        fetch: fetchWithCredentials,
      }),
      false: httpBatchLink({
        url,
        transformer: superjson,
        fetch: fetchWithCredentials,
      }),
    }),
  ];
}
