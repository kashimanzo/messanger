import { Worker } from 'bullmq';
import { getWorkerRedisConnection } from './redis';
import { getConfiguredMessagesPerSecond } from './rate-limit';
import { WHATSAPP_SEND_QUEUE } from './campaign-service';
import { processWhatsAppJobData } from './process-job';
import type { WhatsAppQueueJobData } from './types';

let worker: Worker | null = null;

export function startWhatsAppWorker() {
  if (worker) {
    return worker;
  }

  const messagesPerSecond = getConfiguredMessagesPerSecond();

  worker = new Worker<WhatsAppQueueJobData>(
    WHATSAPP_SEND_QUEUE,
    async (job) => {
      await processWhatsAppJobData(job.data, job.attemptsMade + 1);
    },
    {
      connection: getWorkerRedisConnection(),
      concurrency: 1,
      limiter: {
        max: messagesPerSecond,
        duration: 1000,
      },
    },
  );

  worker.on('ready', () => {
    console.info(
      `[whatsapp-worker] started (${messagesPerSecond} messages/second limit)`,
    );
  });

  worker.on('error', (error) => {
    console.error('[whatsapp-worker] error', error);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[whatsapp-worker] job ${job?.id ?? 'unknown'} failed`,
      error.message,
    );
  });

  return worker;
}

export async function ensureWhatsAppWorker() {
  return startWhatsAppWorker();
}

export async function stopWhatsAppWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
