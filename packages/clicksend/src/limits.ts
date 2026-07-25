/** ClickSend SMS campaigns support up to this many recipients per list send. */
export const CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS = 20_000;

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
