const GENERIC_NETWORK_MESSAGES = new Set([
  'load failed',
  'failed to fetch',
  'networkerror when attempting to fetch resource',
  'network request failed',
  'network error',
  'the internet connection appears to be offline',
  'the network connection was lost',
  'a server with the specified hostname could not be found',
  'fetch failed',
  'unknown error',
]);

const CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'You must be signed in to continue.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: 'The requested item was not found.',
  TIMEOUT: 'The request timed out. Please try again.',
  INTERNAL_SERVER_ERROR: 'A server error occurred. Please try again.',
  BAD_REQUEST: 'Invalid request. Check your input and try again.',
  PARSE_ERROR: 'Invalid response from the server.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait and try again.',
};

function isGenericNetworkMessage(message: string) {
  return GENERIC_NETWORK_MESSAGES.has(message.trim().toLowerCase());
}

function humanizeMessage(message: string) {
  const trimmed = message.trim();
  return CODE_MESSAGES[trimmed] ?? CODE_MESSAGES[trimmed.toUpperCase()] ?? trimmed;
}

function pushCandidate(candidates: string[], value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed || isGenericNetworkMessage(trimmed)) {
    return;
  }

  candidates.push(humanizeMessage(trimmed));
}

function collectZodMessages(zodError: unknown, candidates: string[]) {
  if (!zodError || typeof zodError !== 'object') {
    return;
  }

  const record = zodError as {
    formErrors?: unknown;
    fieldErrors?: Record<string, unknown>;
  };

  if (Array.isArray(record.formErrors)) {
    for (const entry of record.formErrors) {
      pushCandidate(candidates, entry);
    }
  }

  if (record.fieldErrors && typeof record.fieldErrors === 'object') {
    for (const [field, messages] of Object.entries(record.fieldErrors)) {
      if (!Array.isArray(messages) || messages.length === 0) {
        continue;
      }

      const first = messages.find(
        (message): message is string =>
          typeof message === 'string' && message.trim().length > 0,
      );

      if (first) {
        pushCandidate(candidates, `${field}: ${first}`);
      }
    }
  }
}

function collectFromObject(error: object, candidates: string[], depth: number) {
  if (depth > 4) {
    return;
  }

  const record = error as {
    message?: unknown;
    shape?: { message?: unknown; data?: unknown };
    data?: {
      message?: unknown;
      zodError?: unknown;
      code?: unknown;
    };
    meta?: {
      responseJSON?: unknown;
    };
    cause?: unknown;
    error?: unknown;
  };

  // Prefer structured API / tRPC fields over the top-level message, which is
  // often WebKit's opaque "Load failed" when CORS/native fetch fails.
  pushCandidate(candidates, record.shape?.message);
  pushCandidate(candidates, record.data?.message);

  if (typeof record.data?.code === 'string') {
    pushCandidate(candidates, record.data.code);
  }

  if (record.data?.zodError) {
    collectZodMessages(record.data.zodError, candidates);
  }

  const responseJson = record.meta?.responseJSON;
  if (responseJson && typeof responseJson === 'object') {
    const json = responseJson as {
      error?: {
        message?: unknown;
        data?: { zodError?: unknown; code?: unknown };
      };
      message?: unknown;
    };

    pushCandidate(candidates, json.error?.message);
    pushCandidate(candidates, json.message);

    if (typeof json.error?.data?.code === 'string') {
      pushCandidate(candidates, json.error.data.code);
    }

    if (json.error?.data?.zodError) {
      collectZodMessages(json.error.data.zodError, candidates);
    }
  }

  pushCandidate(candidates, record.message);

  if (record.error && typeof record.error === 'object') {
    collectFromObject(record.error as object, candidates, depth + 1);
  }

  if (record.cause && typeof record.cause === 'object') {
    collectFromObject(record.cause as object, candidates, depth + 1);
  } else if (typeof record.cause === 'string') {
    pushCandidate(candidates, record.cause);
  }
}

/**
 * Normalize unknown thrown/API values into a user-facing string.
 * Skips generic WebView/network messages like "Load failed" so callers can
 * show action-specific text when the real API message isn't available.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const candidates: string[] = [];

  if (typeof error === 'string') {
    pushCandidate(candidates, error);
  } else if (error && typeof error === 'object') {
    collectFromObject(error, candidates, 0);
  }

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Prefer the action-specific fallback over opaque WebKit "Load failed".
  return fallback;
}
