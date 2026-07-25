//@ts-check

const path = require('path');
const { composePlugins, withNx } = require('@nx/next');

// Load workspace root .env so shared packages get DATABASE_URL at runtime
require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
});

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  serverExternalPackages: [
    'better-auth',
    '@prisma/client',
    'prisma',
    'kysely',
    'bullmq',
    'ioredis',
  ],
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
