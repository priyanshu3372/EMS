import type { ScopedDb } from './scoped'

/**
 * Transaction boundaries are owned by services. Repositories never open one;
 * they accept whatever handle they are given.
 *
 * Prisma's defaults are timeout 5s / maxWait 2s, which a payroll run writing a
 * hundred payslips will blow straight through. These limits are raised
 * deliberately rather than discovered in production.
 */
const DEFAULTS = {
  /** How long the transaction may run before Postgres rolls it back. */
  timeout: 120_000,
  /** How long to wait for a free connection before giving up. */
  maxWait: 10_000,
} as const

/**
 * The scoping extension is applied to the client, and Prisma derives the
 * transaction handle from that same client — so `tx` stays scoped. The test in
 * scoped.test.ts proves this rather than assuming it, because if it were ever
 * untrue every transactional write would silently lose its company filter.
 */
export async function withTransaction<T>(
  db: ScopedDb,
  fn: (tx: Parameters<Parameters<ScopedDb['$transaction']>[0]>[0]) => Promise<T>,
  options: { timeout?: number; maxWait?: number } = {},
): Promise<T> {
  return db.$transaction(fn as never, { ...DEFAULTS, ...options }) as Promise<T>
}
