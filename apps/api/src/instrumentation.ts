export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { isRedisAvailable, ensureWhatsAppWorker } = await import(
      '@bulk-messanger/queue'
    );

    if (await isRedisAvailable()) {
      await ensureWhatsAppWorker();
    } else {
      console.warn(
        '[api] Redis not available — campaigns will process inline until Redis is started',
      );
    }
  }
}
