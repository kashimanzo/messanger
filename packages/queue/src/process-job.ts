import { prisma } from '@bulk-messanger/database';
import { sendTemplateMessage, sendTextMessage } from '@bulk-messanger/whatsapp';
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

  const channel = data.channel ?? 'WHATSAPP';

  let result: {
    success: boolean;
    messageId?: string;
    error?: string;
    rateLimited?: boolean;
    retryAfterMs?: number;
  };
  let rateLimit: { retryAfterMs?: number; remaining?: number } | undefined;

  if (channel === 'SMS') {
    const response = await sendSmsMessage(data.phoneNumber, data.textBody ?? '', {
      from: data.from,
    });
    result = response.result;
  } else if (data.type === 'TEMPLATE' && data.template) {
    const response = await sendTemplateMessage(data.phoneNumber, data.template);
    result = response.result;
    rateLimit = response.rateLimit;
  } else {
    const response = await sendTextMessage(data.phoneNumber, data.textBody ?? '');
    result = response.result;
    rateLimit = response.rateLimit;
  }

  if (rateLimit?.retryAfterMs) {
    dynamicDelayMs = Math.max(dynamicDelayMs, rateLimit.retryAfterMs);
  } else if (rateLimit?.remaining !== undefined && rateLimit.remaining <= 2) {
    dynamicDelayMs = getDefaultDelayMs() * 2;
  } else {
    dynamicDelayMs = getDefaultDelayMs();
  }

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
        error:
          result.error ??
          `Rate limited by ${channel === 'SMS' ? 'ClickSend' : 'WhatsApp'}`,
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
      whatsappMessageId: channel === 'WHATSAPP' ? result.messageId : undefined,
      providerMessageId: result.messageId,
      error: null,
      sentAt: new Date(),
    },
  });

  await refreshCampaignStatus(data.campaignId);

  await new Promise((resolve) => setTimeout(resolve, getDelayMs()));
}
