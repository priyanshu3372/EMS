import { prisma } from './prisma'
import { isTenantModel } from './tenantModels'

/**
 * Company scoping, applied by the database handle rather than by the caller.
 *
 * `forOrg(id)` returns a Prisma client that injects `organizationId` into every
 * read, write and delete on a tenant model. Because repositories can only ever
 * obtain this handle, a query that crosses companies is unreachable — not
 * discouraged, unreachable.
 *
 * This is also the multi-tenant seam. Today there is one organization and the
 * filter is a constant; the SaaS phase changes where the id comes from and
 * nothing else. No repository, service or domain function is touched.
 *
 * ── Known limits, stated plainly ───────────────────────────────────────────
 * An extension cannot see inside `$queryRaw`, and it cannot reach nested
 * `connect:` writes. Both are therefore banned outside platform/db by
 * convention and review. Scoping here is enforced-by-default, not
 * impossible-to-bypass, and pretending otherwise would be worse than saying so.
 */

type WhereArgs = { where?: Record<string, unknown> }
type DataArgs = { data?: Record<string, unknown> | Record<string, unknown>[] }

/** Operations whose `where` selects existing rows. */
const WHERE_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
])

/**
 * findUnique's `where` only accepts unique selectors, so organizationId cannot
 * simply be added to it. Instead the query runs and the result is checked —
 * a row belonging to another company is reported as not found.
 */
const UNIQUE_OPERATIONS = new Set(['findUnique', 'findUniqueOrThrow'])

export function forOrg(organizationId: string) {
  if (!organizationId) {
    // A missing id must never silently mean "no filter".
    throw new Error('forOrg() requires an organizationId')
  }

  return prisma.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantModel(model)) return query(args)

          // Past this point the model is known to carry organizationId, but the
          // argument types are a union across every model — including global
          // ones that have no such column. `run` narrows once, here, instead of
          // casting at five separate call sites.
          const run = query as (a: unknown) => Promise<unknown>

          if (WHERE_OPERATIONS.has(operation)) {
            const a = args as WhereArgs
            return run({ ...a, where: { ...(a.where ?? {}), organizationId } })
          }

          if (operation === 'create') {
            const a = args as DataArgs
            return run({ ...a, data: { ...(a.data as object), organizationId } })
          }

          if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const a = args as DataArgs
            const rows = Array.isArray(a.data) ? a.data : [a.data ?? {}]
            return run({ ...a, data: rows.map((r) => ({ ...r, organizationId })) })
          }

          if (operation === 'upsert') {
            const a = args as WhereArgs & {
              create?: Record<string, unknown>
              update?: Record<string, unknown>
            }
            return run({
              ...a,
              where: { ...(a.where ?? {}), organizationId },
              create: { ...(a.create ?? {}), organizationId },
            })
          }

          if (UNIQUE_OPERATIONS.has(operation)) {
            const row = (await query(args)) as { organizationId?: string } | null
            if (row && row.organizationId !== organizationId) {
              // Belongs to another company. Report it as absent rather than
              // forbidden — existence itself should not leak.
              if (operation === 'findUniqueOrThrow') {
                throw new Error(`No ${model} found`)
              }
              return null
            }
            return row
          }

          return query(args)
        },
      },
    },
  })
}

/** The only database handle application code ever sees. */
export type ScopedDb = ReturnType<typeof forOrg>
