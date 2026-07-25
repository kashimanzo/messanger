import { Queue } from 'bullmq';
import { prisma } from '@bulk-messanger/database';
import { processCampaignInline } from './inline-processor';
import { getQueueRedisConnection, isRedisAvailable } from './redis';
import { ensureWhatsAppWorker } from './worker';
import { getConfiguredMessagesPerSecond } from './rate-limit';
import type {
  EnqueueTextCampaignInput,
  WhatsAppQueueJobData,
} from './types';

export const WHATSAPP_SEND_QUEUE = 'whatsapp-send';

let queue: Queue | null = null;

export function getWhatsAppQueue() {
  if (!queue) {
    queue = new Queue<WhatsAppQueueJobData>(WHATSAPP_SEND_QUEUE, {
      connection: getQueueRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }

  return queue;
}

async function filterOptedOutRecipients(
  recipients: Array<{ phoneNumber: string; contactName?: string }>,
) {
  const optOuts = await prisma.optOutContact.findMany({
    where: {
      phoneNumber: {
        in: recipients.map((recipient) => recipient.phoneNumber),
      },
    },
    select: { phoneNumber: true },
  });

  const optedOut = new Set(optOuts.map((entry) => entry.phoneNumber));

  return recipients.map((recipient) => ({
    ...recipient,
    optedOut: optedOut.has(recipient.phoneNumber),
  }));
}

async function enqueueCampaignMessages(
  campaignId: string,
  userId: string,
  recipients: Array<{ phoneNumber: string; contactName?: string; optedOut: boolean }>,
  payload: {
    textBody?: string;
    from?: string;
  },
) {
  const sendQueue = getWhatsAppQueue();
  const messageRecords = await prisma.$transaction(async (tx) => {
    const records = [];

    for (const recipient of recipients) {
      const record = await tx.campaignMessage.create({
        data: {
          campaignId,
          phoneNumber: recipient.phoneNumber,
          contactName: recipient.contactName,
          status: recipient.optedOut ? 'SKIPPED_OPTOUT' : 'QUEUED',
        },
      });
      records.push(record);
    }

    return records;
  });

  const skippedCount = recipients.filter((recipient) => recipient.optedOut).length;
  const jobs: WhatsAppQueueJobData[] = [];

  for (const record of messageRecords) {
    if (record.status === 'SKIPPED_OPTOUT') {
      continue;
    }

    jobs.push({
      campaignMessageId: record.id,
      campaignId,
      userId,
      phoneNumber: record.phoneNumber,
      channel: 'SMS',
      type: 'TEXT',
      textBody: payload.textBody,
      from: payload.from,
    });
  }

  const redisAvailable = await isRedisAvailable();

  if (redisAvailable) {
    for (const job of jobs) {
      await sendQueue.add('send-message', job, {
        jobId: job.campaignMessageId,
      });
    }

    await ensureWhatsAppWorker();
  } else {
    console.warn(
      '[sms-queue] Redis unavailable — processing campaign inline in API process',
    );
    processCampaignInline(campaignId, jobs);
  }

  const pendingCount = messageRecords.length - skippedCount;

  await prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status: pendingCount > 0 ? 'PROCESSING' : skippedCount > 0 ? 'PARTIAL' : 'COMPLETED',
      pendingCount,
      failedCount: skippedCount,
      completedAt: pendingCount === 0 ? new Date() : null,
    },
  });

  return { pendingCount, skippedCount };
}

export async function enqueueTextCampaign(input: EnqueueTextCampaignInput) {
  const recipients = await filterOptedOutRecipients(input.recipients);

  const campaign = await prisma.messageCampaign.create({
    data: {
      userId: input.userId,
      type: 'TEXT',
      channel: 'SMS',
      status: 'QUEUED',
      textBody: input.textBody,
      totalCount: recipients.length,
      pendingCount: recipients.length,
    },
  });

  await enqueueCampaignMessages(campaign.id, input.userId, recipients, {
    textBody: input.textBody,
    from: input.from,
  });

  return serializeCampaign(
    await prisma.messageCampaign.findUniqueOrThrow({
      where: { id: campaign.id },
    }),
  );
}

export async function refreshCampaignStatus(campaignId: string) {
  const [sentCount, failedCount, pendingCount, skippedCount] = await Promise.all([
    prisma.campaignMessage.count({
      where: { campaignId, status: 'SENT' },
    }),
    prisma.campaignMessage.count({
      where: { campaignId, status: 'FAILED' },
    }),
    prisma.campaignMessage.count({
      where: { campaignId, status: { in: ['PENDING', 'QUEUED'] } },
    }),
    prisma.campaignMessage.count({
      where: { campaignId, status: 'SKIPPED_OPTOUT' },
    }),
  ]);

  const totalHandled = sentCount + failedCount + skippedCount;
  const campaign = await prisma.messageCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return null;
  }

  let status = campaign.status;

  if (pendingCount === 0 && totalHandled > 0) {
    if (failedCount > 0 && sentCount > 0) {
      status = 'PARTIAL';
    } else if (failedCount > 0 && sentCount === 0) {
      status = 'FAILED';
    } else {
      status = 'COMPLETED';
    }
  } else if (pendingCount > 0) {
    status = 'PROCESSING';
  }

  return prisma.messageCampaign.update({
    where: { id: campaignId },
    data: {
      status,
      sentCount,
      failedCount: failedCount + skippedCount,
      pendingCount,
      completedAt: pendingCount === 0 ? new Date() : null,
    },
  });
}

export function serializeCampaign(campaign: {
  id: string;
  type: 'TEMPLATE' | 'TEXT';
  channel?: 'WHATSAPP' | 'SMS';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  templateName: string | null;
  templateLanguage: string | null;
  textBody: string | null;
  groupId: string | null;
  groupName: string | null;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}) {
  const progress =
    campaign.totalCount === 0
      ? 0
      : Math.round(
          ((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100,
        );

  return {
    id: campaign.id,
    type: campaign.type,
    channel: campaign.channel ?? 'SMS',
    status: campaign.status,
    templateName: campaign.templateName,
    templateLanguage: campaign.templateLanguage,
    textBody: campaign.textBody,
    groupId: campaign.groupId,
    groupName: campaign.groupName,
    totalCount: campaign.totalCount,
    sentCount: campaign.sentCount,
    failedCount: campaign.failedCount,
    pendingCount: campaign.pendingCount,
    progress,
    messagesPerSecond: getConfiguredMessagesPerSecond(),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    completedAt: campaign.completedAt,
  };
}

export function serializeCampaignMessage(message: {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  status: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED_OPTOUT';
  whatsappMessageId: string | null;
  providerMessageId?: string | null;
  error: string | null;
  attempts: number;
  sentAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    phoneNumber: message.phoneNumber,
    contactName: message.contactName,
    status: message.status,
    whatsappMessageId: message.whatsappMessageId,
    providerMessageId: message.providerMessageId ?? message.whatsappMessageId,
    error: message.error,
    attempts: message.attempts,
    sentAt: message.sentAt,
    createdAt: message.createdAt,
  };
}
