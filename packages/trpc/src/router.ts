import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import {
  contactInputSchema,
  getOwnedContact,
  importContactSchema,
  phoneNumberSchema,
  serializeContact,
} from './contacts';
import {
  getOwnedCampaign,
  resolveCampaignRecipients,
  serializeCampaign,
  serializeCampaignMessage,
} from './campaigns';
import {
  contactGroupInputSchema,
  getOwnedContactGroup,
  groupInclude,
  replaceGroupMembers,
  serializeContactGroup,
  validateOwnedContactIds,
} from './groups';
import type { TRPCContext } from './context';


const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in to continue.',
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  })),
  getSession: publicProcedure.query(({ ctx }) => ctx.session),
  getProfile: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    image: ctx.user.image,
    createdAt: ctx.user.createdAt,
  })),
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');

      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { name: input.name },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    }),
  listContacts: protectedProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      const search = input?.search?.trim();

      const contacts = await prisma.contact.findMany({
        where: {
          userId: ctx.user.id,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { phoneNumber: { contains: search } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      });

      return contacts.map(serializeContact);
    }),
  getContactStats: protectedProcedure.query(async ({ ctx }) => {
    const { prisma } = await import('@bulk-messanger/database');
    const [total, manual, imported] = await Promise.all([
      prisma.contact.count({ where: { userId: ctx.user.id } }),
      prisma.contact.count({
        where: { userId: ctx.user.id, source: 'MANUAL' },
      }),
      prisma.contact.count({
        where: { userId: ctx.user.id, source: 'IMPORTED' },
      }),
    ]);

    return { total, manual, imported };
  }),
  getContact: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const contact = await getOwnedContact(ctx.user.id, input.id);
      return serializeContact(contact);
    }),
  createContact: protectedProcedure
    .input(contactInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');

      const existing = await prisma.contact.findUnique({
        where: {
          userId_phoneNumber: {
            userId: ctx.user.id,
            phoneNumber: input.phoneNumber,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A contact with this phone number already exists',
        });
      }

      const contact = await prisma.contact.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          phoneNumber: input.phoneNumber,
          email: input.email,
          source: 'MANUAL',
        },
      });

      return serializeContact(contact);
    }),
  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: contactInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      await getOwnedContact(ctx.user.id, input.id);

      const duplicate = await prisma.contact.findFirst({
        where: {
          userId: ctx.user.id,
          phoneNumber: input.data.phoneNumber,
          NOT: { id: input.id },
        },
      });

      if (duplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Another contact already uses this phone number',
        });
      }

      const contact = await prisma.contact.update({
        where: { id: input.id },
        data: {
          name: input.data.name,
          phoneNumber: input.data.phoneNumber,
          email: input.data.email,
        },
      });

      return serializeContact(contact);
    }),
  deleteContact: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      await getOwnedContact(ctx.user.id, input.id);

      await prisma.contact.delete({
        where: { id: input.id },
      });

      return { success: true as const };
    }),
  importContacts: protectedProcedure
    .input(
      z.object({
        contacts: z.array(importContactSchema).min(1).max(500),
        skipDuplicates: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      const existingContacts = await prisma.contact.findMany({
        where: { userId: ctx.user.id },
        select: { phoneNumber: true },
      });
      const existingNumbers = new Set(
        existingContacts.map((entry) => entry.phoneNumber),
      );

      let imported = 0;
      let skipped = 0;
      let invalid = 0;
      const results: Array<{
        phoneNumber: string;
        name: string;
        status: 'imported' | 'duplicate' | 'invalid';
        error?: string;
      }> = [];

      for (const contact of input.contacts) {
        if (!/^\d{10,15}$/.test(contact.phoneNumber)) {
          invalid += 1;
          results.push({
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            status: 'invalid',
            error: 'Invalid phone number',
          });
          continue;
        }

        if (existingNumbers.has(contact.phoneNumber)) {
          skipped += 1;
          results.push({
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            status: 'duplicate',
          });
          continue;
        }

        try {
          await prisma.contact.create({
            data: {
              userId: ctx.user.id,
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              email: contact.email,
              source: 'IMPORTED',
              deviceContactId: contact.deviceContactId,
            },
          });

          existingNumbers.add(contact.phoneNumber);
          imported += 1;
          results.push({
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            status: 'imported',
          });
        } catch {
          skipped += 1;
          results.push({
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            status: 'duplicate',
            error: 'Could not import contact',
          });
        }
      }

      return {
        imported,
        skipped,
        invalid,
        total: input.contacts.length,
        results,
      };
    }),
  sendSmsCampaign: protectedProcedure
    .input(
      z
        .object({
          message: z.string().trim().min(1).max(1600),
          groupId: z.string().min(1).optional(),
          contactIds: z.array(z.string().min(1)).max(500).optional(),
          recipients: z.array(phoneNumberSchema).max(500).optional(),
        })
        .refine(
          (input) =>
            Boolean(input.groupId) ||
            (input.contactIds?.length ?? 0) > 0 ||
            (input.recipients?.length ?? 0) > 0,
          {
            message: 'Select a group, contacts, or recipients',
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        createClickSendListFromRecipients,
        toTrpcClickSendError,
      } = await import('./clicksend');

      try {
        const {
          assertClickSendRecipientCount,
          sendSmsCampaign,
        } = await import('@bulk-messanger/clicksend');

        const list = await createClickSendListFromRecipients({
          userId: ctx.user.id,
          campaignName: `SMS ${new Date().toISOString()}`,
          groupId: input.groupId,
          contactIds: input.contactIds,
          recipients: input.recipients,
        });
        assertClickSendRecipientCount(list.recipients.length);

        return sendSmsCampaign({
          listId: list.listId,
          name: `SMS ${new Date().toISOString()}`,
          body: input.message,
        });
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),
  getCampaign: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const campaign = await getOwnedCampaign(ctx.user.id, input.id);
      return serializeCampaign(campaign);
    }),
  listCampaigns: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      const campaigns = await prisma.messageCampaign.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 20,
      });

      return campaigns.map(serializeCampaign);
    }),
  getCampaignMessages: protectedProcedure
    .input(z.object({ campaignId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      await getOwnedCampaign(ctx.user.id, input.campaignId);

      const messages = await prisma.campaignMessage.findMany({
        where: { campaignId: input.campaignId },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      });

      return messages.map(serializeCampaignMessage);
    }),
  listContactGroups: protectedProcedure.query(async ({ ctx }) => {
    const { prisma } = await import('@bulk-messanger/database');
    const groups = await prisma.contactGroup.findMany({
      where: { userId: ctx.user.id },
      include: groupInclude,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });

    return groups.map(serializeContactGroup);
  }),
  getContactGroup: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const group = await getOwnedContactGroup(ctx.user.id, input.id);
      return serializeContactGroup(group);
    }),
  createContactGroup: protectedProcedure
    .input(contactGroupInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      await validateOwnedContactIds(ctx.user.id, input.contactIds);

      const group = await prisma.contactGroup.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
        },
      });

      await replaceGroupMembers(group.id, input.contactIds);

      const created = await getOwnedContactGroup(ctx.user.id, group.id);
      return serializeContactGroup(created);
    }),
  updateContactGroup: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: contactGroupInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      await getOwnedContactGroup(ctx.user.id, input.id);
      await validateOwnedContactIds(ctx.user.id, input.data.contactIds);

      await prisma.contactGroup.update({
        where: { id: input.id },
        data: { name: input.data.name },
      });

      await replaceGroupMembers(input.id, input.data.contactIds);

      const updated = await getOwnedContactGroup(ctx.user.id, input.id);
      return serializeContactGroup(updated);
    }),
  deleteContactGroup: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import('@bulk-messanger/database');
      await getOwnedContactGroup(ctx.user.id, input.id);

      await prisma.contactGroup.delete({
        where: { id: input.id },
      });

      return { success: true as const };
    }),

  // --- ClickSend SMS templates ---
  listClickSendTemplates: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(15).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { listSmsTemplates } = await import('@bulk-messanger/clicksend');
        return listSmsTemplates({
          page: input?.page,
          limit: input?.limit,
        });
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  getClickSendTemplate: protectedProcedure
    .input(z.object({ templateId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { getSmsTemplate } = await import('@bulk-messanger/clicksend');
        return getSmsTemplate(input.templateId);
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  createClickSendTemplate: protectedProcedure
    .input(
      z.object({
        templateName: z.string().trim().min(1).max(100),
        body: z.string().trim().min(1).max(1600),
      }),
    )
    .mutation(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { createSmsTemplate } = await import('@bulk-messanger/clicksend');
        return createSmsTemplate(input);
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  updateClickSendTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int().positive(),
        templateName: z.string().trim().min(1).max(100),
        body: z.string().trim().min(1).max(1600),
      }),
    )
    .mutation(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { updateSmsTemplate } = await import('@bulk-messanger/clicksend');
        return updateSmsTemplate(input);
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  deleteClickSendTemplate: protectedProcedure
    .input(z.object({ templateId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { deleteSmsTemplate } = await import('@bulk-messanger/clicksend');
        await deleteSmsTemplate(input.templateId);
        return { success: true as const };
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  // --- ClickSend SMS campaigns ---
  listClickSendCampaigns: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(15).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { listSmsCampaigns } = await import('@bulk-messanger/clicksend');
        return listSmsCampaigns({
          page: input?.page,
          limit: input?.limit,
        });
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  getClickSendCampaign: protectedProcedure
    .input(z.object({ smsCampaignId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { getSmsCampaign } = await import('@bulk-messanger/clicksend');
        return getSmsCampaign(input.smsCampaignId);
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  cancelClickSendCampaign: protectedProcedure
    .input(z.object({ smsCampaignId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { toTrpcClickSendError } = await import('./clicksend');

      try {
        const { cancelSmsCampaign } = await import('@bulk-messanger/clicksend');
        return cancelSmsCampaign(input.smsCampaignId);
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  calculateClickSendCampaignPrice: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().min(1).max(100),
          message: z.string().trim().min(1).max(1600),
          from: z.string().trim().min(1).max(20).optional(),
          groupId: z.string().min(1).optional(),
          contactIds: z.array(z.string().min(1)).max(20_000).optional(),
          recipients: z.array(phoneNumberSchema).max(20_000).optional(),
        })
        .refine(
          (input) =>
            Boolean(input.groupId) ||
            (input.contactIds?.length ?? 0) > 0 ||
            (input.recipients?.length ?? 0) > 0,
          { message: 'Select a group, contacts, or recipients' },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        createClickSendListFromRecipients,
        toTrpcClickSendError,
      } = await import('./clicksend');

      try {
        const {
          assertClickSendRecipientCount,
          calculateSmsCampaignPrice,
          calculateSmsMessagesPrice,
        } = await import('@bulk-messanger/clicksend');

        const { recipients, groupName } = await resolveCampaignRecipients(
          ctx.user.id,
          input,
        );
        assertClickSendRecipientCount(recipients.length);

        if (recipients.length < 1000) {
          const price = await calculateSmsMessagesPrice({
            body: input.message,
            phoneNumbers: recipients.map((recipient) => recipient.phoneNumber),
            from: input.from,
          });

          return {
            mode: 'local' as const,
            price: price.price,
            currency: price.currency,
            totalCount: price.totalCount,
            raw: price.raw,
            listId: undefined as number | undefined,
            listName: undefined as string | undefined,
            recipientCount: recipients.length,
            groupName,
          };
        }

        const list = await createClickSendListFromRecipients({
          userId: ctx.user.id,
          campaignName: input.name,
          groupId: input.groupId,
          contactIds: input.contactIds,
          recipients: input.recipients,
        });

        const price = await calculateSmsCampaignPrice({
          listId: list.listId,
          name: input.name,
          body: input.message,
          from: input.from,
        });

        return {
          mode: 'clicksend' as const,
          ...price,
          listId: list.listId,
          listName: list.listName,
          recipientCount: list.recipients.length,
          groupName: list.groupName,
        };
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),

  sendClickSendCampaign: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().min(1).max(100),
          message: z.string().trim().min(1).max(1600),
          from: z.string().trim().min(1).max(20).optional(),
          schedule: z.number().int().positive().optional(),
          listId: z.number().int().positive().optional(),
          groupId: z.string().min(1).optional(),
          contactIds: z.array(z.string().min(1)).max(20_000).optional(),
          recipients: z.array(phoneNumberSchema).max(20_000).optional(),
        })
        .refine(
          (input) =>
            Boolean(input.groupId) ||
            (input.contactIds?.length ?? 0) > 0 ||
            (input.recipients?.length ?? 0) > 0,
          { message: 'Select a group, contacts, or recipients' },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        createClickSendListFromRecipients,
        toTrpcClickSendError,
      } = await import('./clicksend');

      try {
        const {
          assertClickSendRecipientCount,
          sendSmsCampaign,
        } = await import('@bulk-messanger/clicksend');
        const { sendTrackedSmsCampaign } = await import('./send-tracked-sms');
        const { recipients, groupName } = await resolveCampaignRecipients(
          ctx.user.id,
          input,
        );
        assertClickSendRecipientCount(recipients.length);

        // Small/medium blasts: send via ClickSend SMS API and keep local
        // per-message details for the campaign detail screen.
        if (recipients.length < 1000) {
          const campaign = await sendTrackedSmsCampaign({
            userId: ctx.user.id,
            name: input.name,
            textBody: input.message,
            from: input.from,
            groupId: input.groupId,
            groupName,
            recipients,
          });

          return {
            mode: 'local' as const,
            campaignId: campaign.id,
            smsCampaignId: undefined as number | undefined,
            recipientCount: campaign.totalCount,
            groupName,
            status: campaign.status,
            name: input.name,
            body: input.message,
            from: input.from,
          };
        }

        // Large blasts: ClickSend native campaign API.
        let listId = input.listId;
        let listName: string | undefined;
        let recipientCount = recipients.length;

        if (!listId) {
          const list = await createClickSendListFromRecipients({
            userId: ctx.user.id,
            campaignName: input.name,
            groupId: input.groupId,
            contactIds: input.contactIds,
            recipients: input.recipients,
          });
          listId = list.listId;
          listName = list.listName;
          recipientCount = list.recipients.length;
        }

        const campaign = await sendSmsCampaign({
          listId,
          name: input.name,
          body: input.message,
          from: input.from,
          schedule: input.schedule,
        });

        return {
          mode: 'clicksend' as const,
          ...campaign,
          campaignId: undefined as string | undefined,
          recipientCount: recipientCount ?? campaign.totalCount,
          groupName,
          listName: listName ?? campaign.listName,
        };
      } catch (error) {
        throw toTrpcClickSendError(error);
      }
    }),
});

export type AppRouter = typeof appRouter;
