import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { Datastore } from './datastore.js';
import { MemoryDatastore } from './memory.js';

export type { Datastore } from './datastore.js';

let datastore: Datastore | null = null;

export async function initDatastore(): Promise<Datastore> {
  if (datastore) return datastore;

  if (env.DATABASE_URL) {
    try {
      const { createPrismaDatastore } = await import('./prisma.js');
      datastore = await createPrismaDatastore(env.DATABASE_URL);
      logger.info('Persistence: MySQL via Prisma');
    } catch (err) {
      logger.error(
        { err },
        'MySQL/Prisma unavailable — falling back to in-memory persistence (dev only, data will not survive restarts)',
      );
      datastore = new MemoryDatastore();
    }
  } else {
    logger.warn(
      'DATABASE_URL not set — using in-memory persistence (dev only, data will not survive restarts)',
    );
    datastore = new MemoryDatastore();
  }

  // Seed the initial admin account (credentials come from env; never code).
  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await datastore.ensureAdmin('Administrator', env.ADMIN_EMAIL, hash);

  return datastore;
}

export function db(): Datastore {
  if (!datastore) throw new Error('Datastore not initialised');
  return datastore;
}
