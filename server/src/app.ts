import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from './config/env'
import { requestContext } from './http/middleware/requestContext'
import { errorHandler, notFound } from './http/middleware/errorHandler'
import { authRouter } from './http/routes/auth.routes'

/**
 * Assembles the app but does not listen. main.ts owns the port, so tests can
 * import createApp() and drive it with supertest without binding a socket.
 */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')

  // In production Nginx sits in front, so req.ip would otherwise be the proxy
  // itself — every visitor sharing one rate-limit bucket. '1' means trust
  // exactly one hop: our own Nginx, and nothing a client can forge beyond it.
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(requestContext)

  app.get('/health', (_req, res) => {
    res.json({
      data: { status: 'ok', env: env.NODE_ENV },
      meta: { requestId: res.locals.requestId },
    })
  })

  app.use('/api/auth', authRouter)

  // Express 5 uses path-to-regexp v8: a bare '*' throws at startup.
  app.use('/{*splat}', notFound)

  // Error middleware must be registered last.
  app.use(errorHandler)

  return app
}
