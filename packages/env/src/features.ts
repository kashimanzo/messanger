/** ClickSend sender helper (no messaging feature flags). */

export function getClickSendFrom(): string | null {
  return process.env['CLICKSEND_FROM']?.trim() || null;
}
