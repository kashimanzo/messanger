import { getClickSendCredentials } from './credentials';
import { clickSendRequest, toE164 } from './http';

export type SmsMessagesPrice = {
  price: number;
  currency?: string;
  totalCount?: number;
  raw: unknown;
};

/**
 * Price via POST /v3/sms/price — preferred for blasts under 1000 recipients.
 */
export async function calculateSmsMessagesPrice(options: {
  body: string;
  phoneNumbers: string[];
  from?: string;
}): Promise<SmsMessagesPrice> {
  const credentials = getClickSendCredentials();
  const from = options.from?.trim() || credentials.from;

  const messages = options.phoneNumbers.map((phoneNumber) => {
    const message: Record<string, string> = {
      to: toE164(phoneNumber),
      body: options.body,
      source: 'bulk-messanger',
    };
    if (from) {
      message.from = from;
    }
    return message;
  });

  const response = await clickSendRequest<Record<string, unknown>>('/sms/price', {
    method: 'POST',
    body: { messages },
  });

  const data = response.data ?? {};
  const currencyObj =
    data._currency && typeof data._currency === 'object'
      ? (data._currency as Record<string, unknown>)
      : data.currency && typeof data.currency === 'object'
        ? (data.currency as Record<string, unknown>)
        : undefined;

  return {
    price: Number(data.total_price ?? data.price ?? 0) || 0,
    currency:
      typeof currencyObj?.currency_name_short === 'string'
        ? currencyObj.currency_name_short
        : typeof data.currency_name_short === 'string'
          ? data.currency_name_short
          : typeof data.currency === 'string'
            ? data.currency
            : undefined,
    totalCount:
      typeof data.total_count === 'number'
        ? data.total_count
        : typeof data.queued_count === 'number'
          ? data.queued_count
          : options.phoneNumbers.length,
    raw: data,
  };
}
