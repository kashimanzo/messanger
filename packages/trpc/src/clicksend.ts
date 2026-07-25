import { TRPCError } from '@trpc/server';
import { ClickSendApiError } from '@bulk-messanger/clicksend';
import {
  resolveCampaignRecipients,
  type ResolvedRecipient,
} from './campaigns';

export function toTrpcClickSendError(error: unknown): TRPCError {
  if (error instanceof ClickSendApiError) {
    if (error.status === 401) {
      return new TRPCError({
        code: 'UNAUTHORIZED',
        message: error.message,
      });
    }

    if (error.status === 404) {
      return new TRPCError({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }

    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  if (
    error instanceof Error &&
    (/ClickSend sender is required/i.test(error.message) ||
      /recipients/i.test(error.message) ||
      /support up to/i.test(error.message))
  ) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'ClickSend request failed',
  });
}

function splitName(fullName?: string) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Contact', lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export async function createClickSendListFromRecipients(options: {
  userId: string;
  campaignName: string;
  groupId?: string;
  contactIds?: string[];
  recipients?: string[];
}): Promise<{
  listId: number;
  listName: string;
  recipients: ResolvedRecipient[];
  groupName?: string;
}> {
  const { createListWithContacts } = await import('@bulk-messanger/clicksend');
  const { recipients, groupName } = await resolveCampaignRecipients(
    options.userId,
    options,
  );

  if (recipients.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No recipients found for this campaign',
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const listName = `BM ${options.campaignName}`.slice(0, 40) + ` ${stamp}`.slice(0, 20);

  const list = await createListWithContacts({
    listName: listName.slice(0, 60),
    contacts: recipients.map((recipient) => {
      const { firstName, lastName } = splitName(recipient.contactName);
      return {
        phoneNumber: recipient.phoneNumber,
        firstName,
        lastName,
      };
    }),
  });

  return {
    listId: list.listId,
    listName: list.listName,
    recipients,
    groupName,
  };
}
