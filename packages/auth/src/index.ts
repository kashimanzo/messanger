import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { prisma } from '@bulk-messanger/database';

const authUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const webUrl = process.env.VITE_WEB_URL ?? 'http://localhost:4200';
const mobileUrl = process.env.VITE_MOBILE_URL ?? 'http://localhost:4300';
const usesHttps = authUrl.startsWith('https://');

function getTrustedOrigins() {
  const origins = new Set<string>([
    authUrl,
    webUrl,
    mobileUrl,
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
  ]);

  for (const value of [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.CORS_ALLOWED_ORIGINS,
  ]) {
    if (!value) continue;

    for (const origin of value.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return [...origins];
}

export const auth = betterAuth({
  baseURL: authUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer()],
  advanced: {
    crossOriginCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: usesHttps,
    },
  },
  trustedOrigins: getTrustedOrigins(),
});

export type Session = typeof auth.$Infer.Session;
