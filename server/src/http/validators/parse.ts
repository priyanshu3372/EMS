import type { ZodType } from 'zod'
import { ValidationFailed } from '../../platform/errors/AppError'

/**
 * Parse a request body, or throw. Used at the top of every controller.
 *
 * Deliberately a function rather than middleware: middleware would have to hand
 * the parsed value back through `req`, which TypeScript cannot narrow, and the
 * controller would end up casting. Here the return type is inferred from the
 * schema, so the controller is typed for free and a field that is not in the
 * schema is a compile error rather than an undefined at runtime.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw ValidationFailed(
      'Request body is invalid',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(body)',
        message: issue.message,
      })),
    )
  }

  return parsed.data
}
