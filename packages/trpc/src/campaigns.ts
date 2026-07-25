import { TRPCError } from '@trpc/server';
import { getOwnedContactGroup, validateOwnedContactIds } from './groups';

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
          ((campaign.sentCount + campaign.failedCount) / campaign.totalCount) *
            100,
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

export async function getOwnedCampaign(userId: string, campaignId: string) {
  const { prisma } = await import('@bulk-messanger/database');
  const campaign = await prisma.messageCampaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
  });

  if (!campaign) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Campaign not found',
    });
  }

  return campaign;
}

export type ResolvedRecipient = {
  phoneNumber: string;
  contactName?: string;
};

export async function resolveCampaignRecipients(
  userId: string,
  input: {
    groupId?: string;
    contactIds?: string[];
    recipients?: string[];
  },
): Promise<{ recipients: ResolvedRecipient[]; groupName?: string }> {
  const { prisma } = await import('@bulk-messanger/database');
  const recipientMap = new Map<string, ResolvedRecipient>();
  let groupName: string | undefined;

  if (input.groupId) {
    const group = await getOwnedContactGroup(userId, input.groupId);
    groupName = group.name;

    for (const member of group.members) {
      recipientMap.set(member.contact.phoneNumber, {
        phoneNumber: member.contact.phoneNumber,
        contactName: member.contact.name,
      });
    }
  }

  if (input.contactIds?.length) {
    await validateOwnedContactIds(userId, input.contactIds);

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        id: { in: input.contactIds },
      },
      select: {
        name: true,
        phoneNumber: true,
      },
    });

    for (const contact of contacts) {
      recipientMap.set(contact.phoneNumber, {
        phoneNumber: contact.phoneNumber,
        contactName: contact.name,
      });
    }
  }

  for (const phoneNumber of input.recipients ?? []) {
    recipientMap.set(phoneNumber, { phoneNumber });
  }

  return {
    recipients: [...recipientMap.values()],
    groupName,
  };
}
