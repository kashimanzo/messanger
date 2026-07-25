import { prisma } from '@bulk-messanger/database';
import { getWhatsAppQueue } from './campaign-service';
import { processCampaignInline } from './inline-processor';
import { isRedisAvailable } from './redis';
import type { WhatsAppQueueJobData } from './types';
import { ensureWhatsAppWorker } from './worker';

const recoveringCampaigns = new Set<string>();

export async function recoverStalledCampaign(campaignId: string) {
  if (recoveringCampaigns.has(campaignId)) {
    return;
  }

  const campaign = await prisma.messageCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || (campaign.status !== 'PROCESSING' && campaign.status !== 'QUEUED')) {
    return;
  }

  const pendingMessages = await prisma.campaignMessage.findMany({
    where: {
      campaignId,
      status: { in: ['PENDING', 'QUEUED'] },
    },
  });

  if (pendingMessages.length === 0) {
    return;
  }

  recoveringCampaigns.add(campaignId);

  try {
    const variables = (campaign.variables ?? []) as NonNullable<
      WhatsAppQueueJobData['template']
    >['variables'];

    const jobs: WhatsAppQueueJobData[] = pendingMessages.map((message) => ({
      campaignMessageId: message.id,
      campaignId,
      userId: campaign.userId,
      phoneNumber: message.phoneNumber,
      channel: campaign.channel ?? 'WHATSAPP',
      type: campaign.type,
      template:
        campaign.type === 'TEMPLATE' && campaign.templateName
          ? {
              name: campaign.templateName,
              language: campaign.templateLanguage ?? 'en_US',
              variables,
            }
          : undefined,
      textBody: campaign.textBody ?? undefined,
    }));

    const redisAvailable = await isRedisAvailable();

    if (redisAvailable) {
      const queue = getWhatsAppQueue();

      for (const job of jobs) {
        const existing = await queue.getJob(job.campaignMessageId);

        if (!existing) {
          await queue.add('send-message', job, {
            jobId: job.campaignMessageId,
          });
        }
      }

      await ensureWhatsAppWorker();
      console.info(`[whatsapp-queue] recovered ${jobs.length} stalled jobs for ${campaignId}`);
    } else {
      processCampaignInline(campaignId, jobs);
      console.info(`[whatsapp-inline] recovered ${jobs.length} stalled jobs for ${campaignId}`);
    }
  } finally {
    recoveringCampaigns.delete(campaignId);
  }
}
