/** ClickSend recommends SMS Send for smaller blasts; native campaigns for larger lists. */
export const CLICKSEND_NATIVE_CAMPAIGN_MIN_RECIPIENTS = 1000;
export const CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS = 20_000;

export type ClickSendSendMode = 'local' | 'clicksend';

export function getClickSendSendMode(recipientCount: number): ClickSendSendMode {
  if (recipientCount < CLICKSEND_NATIVE_CAMPAIGN_MIN_RECIPIENTS) {
    return 'local';
  }

  return 'clicksend';
}

export function assertClickSendRecipientCount(recipientCount: number) {
  if (recipientCount <= 0) {
    throw new Error('No recipients found for this campaign');
  }

  if (recipientCount > CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS) {
    throw new Error(
      `ClickSend campaigns support up to ${CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS.toLocaleString()} recipients. Split this send into smaller batches.`,
    );
  }
}
