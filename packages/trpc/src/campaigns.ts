import { TRPCError } from '@trpc/server';
import {
  serializeCampaign,
  serializeCampaignMessage,
} from '@bulk-messanger/queue';
import { getOwnedContactGroup, validateOwnedContactIds } from './groups';

export { serializeCampaign, serializeCampaignMessage };

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
