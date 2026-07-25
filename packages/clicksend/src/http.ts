import { getClickSendCredentials } from './credentials';

export const CLICKSEND_BASE_URL = 'https://rest.clicksend.com/v3';

export type ClickSendApiResponse<T = unknown> = {
  http_code?: number;
  response_code?: string;
  response_msg?: string;
  data?: T;
};

export class ClickSendApiError extends Error {
  readonly status: number;
  readonly responseCode?: string;

  constructor(message: string, status: number, responseCode?: string) {
    super(message);
    this.name = 'ClickSendApiError';
    this.status = status;
    this.responseCode = responseCode;
  }
}

export function toE164(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.startsWith('+') ? phoneNumber.trim() : `+${digits}`;
}

export function getAuthHeader() {
  const credentials = getClickSendCredentials();
  const token = Buffer.from(
    `${credentials.username}:${credentials.apiKey}`,
  ).toString('base64');

  return {
    credentials,
    authorization: `Basic ${token}`,
  };
}

export async function clickSendRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  } = {},
): Promise<ClickSendApiResponse<T>> {
  const { authorization } = getAuthHeader();
  const method = options.method ?? 'GET';

  const url = new URL(`${CLICKSEND_BASE_URL}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as ClickSendApiResponse<T>;

  if (!response.ok || (payload.response_code && payload.response_code !== 'SUCCESS')) {
    throw new ClickSendApiError(
      payload.response_msg ??
        payload.response_code ??
        `ClickSend error (${response.status})`,
      response.status,
      payload.response_code,
    );
  }

  return payload;
}
