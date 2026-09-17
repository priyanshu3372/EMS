import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'

import { createApp } from '../../app'
import { requestContext } from './requestContext'
import { errorHandler, notFound } from './errorHandler'
import { NotFound, ValidationFailed } from '../../platform/errors/AppError'

describe('the assembled app', () => {
  it('serves /health in the success envelope', async () => {
    const res = await request(createApp()).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.meta.requestId).toEqual(expect.any(String))
    expect(res.headers['x-request-id']).toBe(res.body.meta.requestId)
  })

  it('answers an unknown route in the error envelope, naming the real path', async () => {
    const res = await request(createApp()).get('/does/not/exist')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toContain('/does/not/exist')
    expect(res.body.error.requestId).toEqual(expect.any(String))
  })

  it('does not advertise the framework', async () => {
    const res = await request(createApp()).get('/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})

/**
 * The whole error contract rests on one Express 5 behaviour: a rejected promise
 * from an async handler is forwarded to error middleware automatically. On
 * Express 4 these two tests would hang instead of passing. If they ever start
 * failing, someone has downgraded Express and every async route in the codebase
 * is silently broken.
 */
describe('error handling', () => {
  function appWith(handler: express.RequestHandler) {
    const app = express()
    app.use(express.json())
    app.use(requestContext)
    app.get('/boom', handler)
    app.use('/{*splat}', notFound)
    app.use(errorHandler)
    return app
  }

  it('turns a thrown AppError into its own status and code', async () => {
    const res = await request(
      appWith(async () => {
        throw ValidationFailed('email is required', { field: 'email' })
      }),
    ).get('/boom')

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
    expect(res.body.error.message).toBe('email is required')
    expect(res.body.error.details).toEqual({ field: 'email' })
  })

  it('maps a thrown NotFound to 404', async () => {
    const res = await request(
      appWith(async () => {
        throw NotFound('employee not found')
      }),
    ).get('/boom')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('hides the details of an unexpected error behind a 500', async () => {
    const res = await request(
      appWith(async () => {
        throw new Error('connection string contains a password')
      }),
    ).get('/boom')

    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL')
    expect(res.body.error.message).toBe('Something went wrong')
    expect(JSON.stringify(res.body)).not.toContain('password')
    expect(res.body.error.requestId).toEqual(expect.any(String))
  })
})
