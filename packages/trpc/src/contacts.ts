import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const phoneNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .min(10, 'Phone number is too short')
      .max(15, 'Phone number is too long')
      .regex(/^\d+$/, 'Use digits only (E.164 without +)'),
  );

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phoneNumber: phoneNumberSchema,
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value)),
});

export const importContactSchema = contactInputSchema.extend({
  deviceContactId: z.string().trim().min(1).optional(),
});

export function serializeContact(contact: {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  source: 'MANUAL' | 'IMPORTED';
  deviceContactId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: contact.id,
    name: contact.name,
    phoneNumber: contact.phoneNumber,
    email: contact.email,
    source: contact.source,
    deviceContactId: contact.deviceContactId,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export async function getOwnedContact(userId: string, contactId: string) {
  const { prisma } = await import('@bulk-messanger/database');
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      userId,
    },
  });

  if (!contact) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Contact not found',
    });
  }

  return contact;
}
