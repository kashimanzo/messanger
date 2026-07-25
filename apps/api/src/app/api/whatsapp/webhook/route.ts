import { prisma } from '@bulk-messanger/database';
import { NextResponse } from 'next/server';

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

const OPT_OUT_KEYWORDS = new Set(['stop', 'unsubscribe', 'cancel', 'opt out', 'optout']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const verifyToken = process.env['VERIFY_TOKEN'] ?? process.env['WHATSAPP_VERIFY_TOKEN'];

  if (mode === 'subscribe' && token && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as WebhookPayload;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const body = message.text?.body?.trim().toLowerCase();

        if (!message.from || !body || !OPT_OUT_KEYWORDS.has(body)) {
          continue;
        }

        const phoneNumber = message.from.replace(/\D/g, '');

        await prisma.optOutContact.upsert({
          where: { phoneNumber },
          update: { reason: `Keyword: ${body}` },
          create: {
            phoneNumber,
            reason: `Keyword: ${body}`,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
