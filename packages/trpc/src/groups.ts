import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const contactGroupInputSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100),
  contactIds: z.array(z.string().min(1)).max(500).default([]),
});

export function serializeContactGroup(group: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    contact: {
      id: string;
      name: string;
      phoneNumber: string;
      email: string | null;
    };
  }>;
}) {
  return {
    id: group.id,
    name: group.name,
    memberCount: group.members.length,
    members: [...group.members]
      .sort((left, right) => left.contact.name.localeCompare(right.contact.name))
      .map((member) => ({
        id: member.contact.id,
        name: member.contact.name,
        phoneNumber: member.contact.phoneNumber,
        email: member.contact.email,
      })),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

const groupInclude = {
  members: {
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
        },
      },
    },
  },
};

export { groupInclude };

export async function getOwnedContactGroup(userId: string, groupId: string) {
  const { prisma } = await import('@bulk-messanger/database');
  const group = await prisma.contactGroup.findFirst({
    where: {
      id: groupId,
      userId,
    },
    include: groupInclude,
  });

  if (!group) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Contact group not found',
    });
  }

  return group;
}

export async function validateOwnedContactIds(userId: string, contactIds: string[]) {
  if (contactIds.length === 0) {
    return [];
  }

  const { prisma } = await import('@bulk-messanger/database');
  const contacts = await prisma.contact.findMany({
    where: {
      userId,
      id: { in: contactIds },
    },
    select: {
      id: true,
      phoneNumber: true,
    },
  });

  if (contacts.length !== contactIds.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'One or more selected contacts were not found',
    });
  }

  return contacts;
}

export async function replaceGroupMembers(
  groupId: string,
  contactIds: string[],
) {
  const { prisma } = await import('@bulk-messanger/database');

  await prisma.contactGroupMember.deleteMany({
    where: { groupId },
  });

  if (contactIds.length > 0) {
    await prisma.contactGroupMember.createMany({
      data: contactIds.map((contactId) => ({
        groupId,
        contactId,
      })),
    });
  }
}
