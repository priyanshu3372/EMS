import { PrismaClient } from '@prisma/client'
import { env } from '../../config/env'

/**
 * The raw, UNSCOPED Prisma client.
 *
 * Only two files may import this: scoped.ts and unsafe.ts. Everything else gets
 * a company-scoped handle, so a query that crosses companies is not merely
 * discouraged — it has no way to be written.
 *
 * A lint rule enforces the import restriction. If you find yourself wanting the
 * raw client somewhere else, that is the signal to add a repository instead.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

/** Called on shutdown so the process can exit cleanly. */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect()
}
