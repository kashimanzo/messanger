import { prisma } from '@bulk-messanger/database';
import { sendSmsMessage } from '@bulk-messanger/clicksend';
import {
  getConfiguredMessagesPerSecond,
  getDefaultDelayMs,
  isRateLimitError,
} from './rate-limit';
import { refreshCampaignStatus } from './campaign-service';
import type { WhatsAppQueueJobData } from './types';

let dynamicDelayMs = getDefaultDelayMs();

function getDelayMs() {
  return Math.max(dynamicDelayMs, Math.ceil(1000 / getConfiguredMessagesPerSecond()));
}

export async function processWhatsAppJobData(
  data: WhatsAppQueueJobData,
  attempt = 1,
): Promise<void> {
  await prisma.campaignMessage.update({
    where: { id: data.campaignMessageId },
    data: {
      status: 'QUEUED',
      attempts: attempt,
    },
  });

  const response = await sendSmsMessage(data.phoneNumber, data.textBody ?? '', {
    from: data.from,
  });
  const result = response.result;

  dynamicDelayMs = getDefaultDelayMs();

  if (result.rateLimited || isRateLimitError(result.error)) {
    if (attempt < 3) {
      const delay = result.retryAfterMs ?? getDelayMs();
      await new Promise((resolve) => setTimeout(resolve, delay));
      return processWhatsAppJobData(data, attempt + 1);
    }

    await prisma.campaignMessage.update({
      where: { id: data.campaignMessageId },
      data: {
        status: 'FAILED',
        error: result.error ?? 'Rate limited by ClickSend',
      },
    });
    await refreshCampaignStatus(data.campaignId);
    return;
  }

  if (!result.success) {
    await prisma.campaignMessage.update({
      where: { id: data.campaignMessageId },
      data: {
        status: 'FAILED',
        error: result.error,
      },
    });
    await refreshCampaignStatus(data.campaignId);
    return;
  }

  await prisma.campaignMessage.update({
    where: { id: data.campaignMessageId },
    data: {
      status: 'SENT',
      providerMessageId: result.messageId,
      error: null,
      sentAt: new Date(),
    },
  });

  await refreshCampaignStatus(data.campaignId);

  await new Promise((resolve) => setTimeout(resolve, getDelayMs()));
}
