import { getClickSendCredentials } from './credentials';

const CLICKSEND_SEND_URL = 'https://rest.clicksend.com/v3/sms/send';

export type SmsSendResult = {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

export type SmsSendResultWithMeta = {
  result: SmsSendResult;
};

type ClickSendMessageResult = {
  message_id?: string;
  status?: string;
  to?: string;
};

type ClickSendResponse = {
  http_code?: number;
  response_code?: string;
  response_msg?: string;
  data?: {
    messages?: ClickSendMessageResult[];
  };
};

/** Contacts are stored as digits-only; ClickSend expects E.164 with "+". */
function toE164(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.startsWith('+') ? phoneNumber.trim() : `+${digits}`;
}

function getRetryAfterMs(headers: Headers) {
  const value = headers.get('retry-after');
  if (!value) return 2_000;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? 2_000 : Math.max(0, retryAt - Date.now());
}

function isSuccessStatus(status?: string) {
  if (!status) return false;
  const normalized = status.toUpperCase();
  return (
    normalized === 'SUCCESS' ||
    normalized === 'QUEUED' ||
    normalized === 'SCHEDULED'
  );
}

export async function sendSmsMessage(
  toNumber: string,
  body: string,
  options?: { from?: string },
): Promise<SmsSendResultWithMeta> {
  try {
    const credentials = getClickSendCredentials();
    const to = toE164(toNumber);
    const auth = Buffer.from(
      `${credentials.username}:${credentials.apiKey}`,
    ).toString('base64');

    const message: Record<string, string> = {
      to,
      body,
      source: 'bulk-messanger',
    };

    const from = options?.from?.trim() || credentials.from;
    if (from) {
      message.from = from;
    }

    const response = await fetch(CLICKSEND_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [message],
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as ClickSendResponse;
    const firstMessage = payload.data?.messages?.[0];
    const rateLimited = response.status === 429;

    if (!response.ok || payload.response_code !== 'SUCCESS') {
      return {
        result: {
          to: toNumber,
          success: false,
          error:
            firstMessage?.status && firstMessage.status !== 'SUCCESS'
              ? firstMessage.status
              : payload.response_msg ??
                payload.response_code ??
                `ClickSend error (${response.status})`,
          rateLimited,
          retryAfterMs: rateLimited
            ? getRetryAfterMs(response.headers)
            : undefined,
        },
      };
    }

    if (!firstMessage || !isSuccessStatus(firstMessage.status)) {
      return {
        result: {
          to: toNumber,
          success: false,
          error: firstMessage?.status ?? 'ClickSend did not queue the message.',
        },
      };
    }

    if (!firstMessage.message_id) {
      return {
        result: {
          to: toNumber,
          success: false,
          error: 'ClickSend accepted the request but returned no message ID.',
        },
      };
    }

    return {
      result: {
        to: toNumber,
        success: true,
        messageId: firstMessage.message_id,
      },
    };
  } catch (error) {
    return {
      result: {
        to: toNumber,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send SMS with ClickSend',
      },
    };
  }
}
