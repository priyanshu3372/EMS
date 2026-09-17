import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

/**
 * Stamps every request with an id that appears in the response body, the
 * X-Request-Id header and every log line for that request. When a user reports
 * an error, that id is how you find it.
 */
export const requestContext: RequestHandler = (_req, res, next) => {
  const requestId = randomUUID()
  res.locals.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}
