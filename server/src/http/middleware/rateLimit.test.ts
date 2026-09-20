import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createLimiter } from './rateLimit'
import { requestContext } from './requestContext'

/**
 * The production limiters skip under NODE_ENV=test, or a suite doing a dozen
 * logins would trip its own defences. That would leave this middleware with no
 * coverage, so the builder is exercised here directly with skipping turned off.
 */
function appWithLimit(limit: number) {
  const app = express()
  app.use(express.json())
  app.use(requestContext)
  app.post(
    '/try',
    createLimiter({ limit, keyGenerator: () => 'one-fixed-key', skip: false }),
    (_req, res) => {
      res.json({ data: { ok: true }, meta: { requestId: res.locals.requestId } })
    },
  )
  return app
}

describe('rate limiting', () => {
  it('allows requests up to the limit and refuses the next one', async () => {
    const app = appWithLimit(3)

    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/try').send({})).status).toBe(200)
    }

    expect((await request(app).post('/try').send({})).status).toBe(429)
  })

  it('answers in the standard error envelope, not the library default', async () => {
    const app = appWithLimit(1)
    await request(app).post('/try').send({})

    const res = await request(app).post('/try').send({})

    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS')
    expect(res.body.error.requestId).toEqual(expect.any(String))
    // No stack, no library wording, no hint about the window size.
    expect(res.body.error.message).toMatch(/try again/i)
  })

  it('tells the client when it may retry', async () => {
    const app = appWithLimit(1)
    await request(app).post('/try').send({})

    const res = await request(app).post('/try').send({})
    expect(res.headers['ratelimit']).toBeDefined()
  })
})
