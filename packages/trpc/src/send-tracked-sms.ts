import { prisma } from '@bulk-messanger/database';
import { sendSmsMessage } from '@bulk-messanger/clicksend';
import { serializeCampaign } from './campaigns';
import type { ResolvedRecipient } from './campaigns';

async function filterOptedOut(
  recipients: ResolvedRecipient[],
): Promise<Array<ResolvedRecipient & { optedOut: boolean }>> {
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

/**
 * Sends SMS via ClickSend immediately and stores per-recipient results
 * so the app can open the local campaign details screen.
 */
export async function sendTrackedSmsCampaign(input: {
  userId: string;
  name?: string;
  textBody: string;
  from?: string;
  groupId?: string;
  groupName?: string;
  recipients: ResolvedRecipient[];
}) {
  const recipients = await filterOptedOut(input.recipients);

  const campaign = await prisma.messageCampaign.create({
    data: {
      userId: input.userId,
      type: 'TEXT',
      channel: 'SMS',
      status: 'PROCESSING',
      textBody: input.textBody,
      templateName: input.name ?? null,
      groupId: input.groupId ?? null,
      groupName: input.groupName ?? null,
      totalCount: recipients.length,
      pendingCount: recipients.length,
    },
  });

  const messageRecords = await prisma.$transaction(
    recipients.map((recipient) =>
      prisma.campaignMessage.create({
        data: {
          campaignId: campaign.id,
          phoneNumber: recipient.phoneNumber,
          contactName: recipient.contactName,
          status: recipient.optedOut ? 'SKIPPED_OPTOUT' : 'QUEUED',
        },
      }),
    ),
  );

  let sentCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  for (let index = 0; index < messageRecords.length; index += 1) {
    const record = messageRecords[index];
    const recipient = recipients[index];

    if (!record || !recipient) continue;

    if (record.status === 'SKIPPED_OPTOUT') {
      failedCount += 1;
      continue;
    }

    const { result } = await sendSmsMessage(recipient.phoneNumber, input.textBody, {
      from: input.from,
    });

    if (result.success) {
      sentCount += 1;
      await prisma.campaignMessage.update({
        where: { id: record.id },
        data: {
          status: 'SENT',
          providerMessageId: result.messageId,
          attempts: { increment: 1 },
          sentAt: new Date(),
          error: null,
        },
      });
    } else {
      failedCount += 1;
      await prisma.campaignMessage.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          error: result.error ?? 'Failed to send SMS',
        },
      });
    }
  }

  pendingCount = recipients.length - sentCount - failedCount;

  let status: 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'PROCESSING' = 'COMPLETED';
  if (pendingCount > 0) {
    status = 'PROCESSING';
  } else if (failedCount > 0 && sentCount > 0) {
    status = 'PARTIAL';
  } else if (failedCount > 0 && sentCount === 0) {
    status = 'FAILED';
  }

  const updated = await prisma.messageCampaign.update({
    where: { id: campaign.id },
    data: {
      status,
      sentCount,
      failedCount,
      pendingCount,
      completedAt: pendingCount === 0 ? new Date() : null,
    },
  });

  return serializeCampaign(updated);
}
