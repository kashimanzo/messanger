export type ClickSendCredentials = {
  username: string;
  apiKey: string;
  from?: string;
};

const ALPHANUMERIC_SENDER = /^[A-Za-z0-9+ .&_-]{3,11}$/;
const E164_SENDER = /^\+[1-9]\d{7,14}$/;

export function getClickSendCredentials(): ClickSendCredentials {
  const username = process.env['CLICKSEND_USERNAME']?.trim();
  const apiKey = process.env['CLICKSEND_API_KEY']?.trim();
  const from = process.env['CLICKSEND_FROM']?.trim();

  if (!username || !apiKey) {
    throw new Error(
      'ClickSend is not configured. Set CLICKSEND_USERNAME and CLICKSEND_API_KEY from Dashboard → API Credentials.',
    );
  }

  if (
    from &&
    !ALPHANUMERIC_SENDER.test(from) &&
    !E164_SENDER.test(from)
  ) {
    throw new Error(
      'CLICKSEND_FROM must be an alphanumeric sender (3–11 chars) or an E.164 number like +4477....',
    );
  }

  return {
    username,
    apiKey,
    from: from || undefined,
  };
}
