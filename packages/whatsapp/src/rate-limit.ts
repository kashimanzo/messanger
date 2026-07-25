export type WhatsAppRateLimitInfo = {
  retryAfterMs?: number;
  suggestedDelayMs?: number;
  remaining?: number;
};

export function parseRateLimitHeaders(headers: Headers): WhatsAppRateLimitInfo {
  const info: WhatsAppRateLimitInfo = {};

  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      info.retryAfterMs = seconds * 1000;
    }
  }

  const remaining = headers.get('x-ratelimit-remaining');
  if (remaining) {
    const value = Number(remaining);
    if (Number.isFinite(value)) {
      info.remaining = value;
    }
  }

  return info;
}

export function isWhatsAppRateLimitError(
  httpStatus: number,
  errorMessage?: string,
  errorCode?: number,
): boolean {
  if (httpStatus === 429 || errorCode === 130429 || errorCode === 80007) {
    return true;
  }

  if (!errorMessage) {
    return false;
  }

  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('throttl')
  );
}
