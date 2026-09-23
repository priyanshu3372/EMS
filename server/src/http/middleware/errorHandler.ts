import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../../platform/errors/AppError'

/**
 * These two functions are the ONLY place in the server that sends a 4xx or 5xx
 * response. Everything else throws. That rule is what makes the error contract
 * uniform, and it is enforceable by review: grep for res.status(4 or res.status(5
 * outside this file and there should be no hits.
 *
 * This works because Express 5 forwards rejected promises from async handlers
 * to error middleware automatically. On Express 4 it would not, and a throwing
 * async controller would hang the request instead.
 */

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      // originalUrl, not path — inside an app.use() mount Express strips the
      // matched prefix, so req.path here would always be '/'.
      message: `No route for ${req.method} ${req.originalUrl}`,
      requestId: res.locals.requestId,
    },
  })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const requestId = res.locals.requestId

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
        requestId,
      },
    })
    return
  }

  // body-parser rejects an oversized body before any route sees it, and that
  // is not a server fault — it is a person uploading something too big. A 500
  // here would read as "the system broke" for what is really "that file is
  // too large", and would be investigated as an outage.
  if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'That upload is too large.',
        requestId,
      },
    })
    return
  }

  // Anything reaching here is a bug. Log everything, tell the client nothing.
  console.error({ requestId, err })

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Something went wrong',
      requestId,
    },
  })
}
