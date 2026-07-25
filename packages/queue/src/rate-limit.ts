export type WhatsAppRateLimitInfo = {
  retryAfterMs?: number;
  suggestedDelayMs?: number;
  remaining?: number;
  resetAt?: number;
};

const DEFAULT_MESSAGES_PER_SECOND = 20;

export function getConfiguredMessagesPerSecond(): number {
  const configured = Number(process.env['WHATSAPP_MESSAGES_PER_SECOND'] ?? DEFAULT_MESSAGES_PER_SECOND);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 80)
    : DEFAULT_MESSAGES_PER_SECOND;
}

export function getDefaultDelayMs(): number {
  return Math.ceil(1000 / getConfiguredMessagesPerSecond());
}

export function parseWhatsAppRateLimitHeaders(
  headers: Headers,
): WhatsAppRateLimitInfo {
  const info: WhatsAppRateLimitInfo = {};

  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      info.retryAfterMs = seconds * 1000;
    }
  }

  const rateLimitRemaining = headers.get('x-ratelimit-remaining');
  const rateLimitReset = headers.get('x-ratelimit-reset');

  if (rateLimitRemaining) {
    const remaining = Number(rateLimitRemaining);
    if (Number.isFinite(remaining)) {
      info.remaining = remaining;
    }
  }

  if (rateLimitReset) {
    const resetAt = Number(rateLimitReset);
    if (Number.isFinite(resetAt)) {
      info.resetAt = resetAt;
    }
  }

  if (info.remaining !== undefined && info.remaining <= 1) {
    info.suggestedDelayMs = getDefaultDelayMs() * 2;
  } else {
    info.suggestedDelayMs = getDefaultDelayMs();
  }

  return info;
}

export function isRateLimitError(message?: string, code?: number): boolean {
  if (code === 429 || code === 130429) {
    return true;
  }

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('throttl')
  );
}
