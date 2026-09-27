/** ClickSend SMS campaigns support up to this many recipients per list send. */
export const CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS = 20_000;

export function assertClickSendRecipientCount(recipientCount: number) {
  if (recipientCount <= 0) {
    throw new Error('No recipients found for this campaign');
  }
}

/** Split items into ClickSend-safe campaign list sizes. */
export function chunkForClickSendCampaigns<T>(
  items: T[],
  size = CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS,
): T[][] {
  if (items.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
