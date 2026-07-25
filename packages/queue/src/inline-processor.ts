import type { WhatsAppQueueJobData } from './types';
import { processWhatsAppJobData } from './process-job';

const activeCampaigns = new Set<string>();

export function processCampaignInline(
  campaignId: string,
  jobs: WhatsAppQueueJobData[],
) {
  if (activeCampaigns.has(campaignId)) {
    return;
  }

  activeCampaigns.add(campaignId);

  void (async () => {
    console.info(
      `[whatsapp-inline] processing campaign ${campaignId} (${jobs.length} messages)`,
    );

    try {
      for (const job of jobs) {
        await processWhatsAppJobData(job);
      }
    } catch (error) {
      console.error(`[whatsapp-inline] campaign ${campaignId} failed`, error);
    } finally {
      activeCampaigns.delete(campaignId);
    }
  })();
}
