import IORedis from 'ioredis';

let queueConnection: IORedis | null = null;
let workerConnection: IORedis | null = null;

function createRedisClient() {
  const redisUrl =
    process.env['REDIS_URL'] ??
    `redis://${process.env['REDIS_HOST'] ?? 'localhost'}:${process.env['REDIS_PORT'] ?? '6379'}`;

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 5000,
    lazyConnect: true,
  });
}

/** Used by BullMQ Queue (producers). */
export function getQueueRedisConnection(): IORedis {
  if (!queueConnection) {
    queueConnection = createRedisClient();
  }

  return queueConnection;
}

/** Used by BullMQ Worker — must be a separate connection. */
export function getWorkerRedisConnection(): IORedis {
  if (!workerConnection) {
    workerConnection = createRedisClient();
  }

  return workerConnection;
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    const connection = getQueueRedisConnection();

    if (connection.status === 'wait' || connection.status === 'end') {
      await connection.connect();
    }

    const response = await connection.ping();
    return response === 'PONG';
  } catch {
    return false;
  }
}
